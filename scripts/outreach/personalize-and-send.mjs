#!/usr/bin/env node
/**
 * Personalize stage-1 cold email + send via Resend.
 *
 * For each enriched prospect (status="enriched") up to LIMIT:
 *   1. Skip if already sent / unsubscribed.
 *   2. Generate AI hook from their homepage.
 *   3. Render stage1 template with { firstName, company, hook, bucket }.
 *   4. Send via Resend tagged campaign=cold-outreach, stage=1.
 *   5. Record send in data/outreach/sent.json + update prospect to status="sent".
 *
 * Usage:
 *   node scripts/outreach/personalize-and-send.mjs [--limit=5] [--dry-run] [--bucket=saas]
 *
 *   # Test send to a specific email without persisting:
 *   node scripts/outreach/personalize-and-send.mjs \
 *     --test --to=you@gmail.com --company-url=https://stripe.com --first-name=Patrick
 *
 * Env required:
 *   RESEND_API_KEY, FROM_EMAIL, ANTHROPIC_API_KEY
 *   FOOTER_ADDRESS  (LA street address for CAN-SPAM compliance)
 */

import { Resend } from "resend"
import { loadEnv, requireEnv, optionalEnv } from "./lib/env.mjs"
import { getBucket, isRoleEmail } from "./lib/icp-buckets.mjs"
import { writeHook } from "./lib/hook-writer.mjs"
import { stage1 } from "./lib/email-templates.mjs"
import {
  readStore,
  writeStore,
  recordSent,
  wasSentTo,
  isUnsubscribed,
  findByEmail,
} from "./lib/state.mjs"

loadEnv()

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=")
      return [k, v ?? true]
    }
    return [a, true]
  })
)

const LIMIT = Number(args.limit || 5)
const DRY_RUN = Boolean(args["dry-run"])
const TEST_MODE = Boolean(args.test)
const BUCKET_ID = args.bucket || "saas"
const RATE_LIMIT_MS = Number(args["rate-ms"] || 30_000) // 30s between sends

const FROM = optionalEnv("FROM_EMAIL", "AI Media <info@aimedia.global>")
const REPLY_TO = optionalEnv("REPLY_TO_EMAIL", "info@aimedia.global")
const FOOTER_ADDRESS = optionalEnv(
  "FOOTER_ADDRESS",
  "AX Media Co · Los Angeles, CA · USA"
)

const resend = new Resend(requireEnv("RESEND_API_KEY"))

async function sendStage1({ prospect, bucket }) {
  const { hook, source } = await writeHook({ prospect, bucket })
  const tpl = stage1({
    firstName: prospect.firstName || "there",
    company: prospect.company || prospect.domain,
    hook,
    bucket,
    footerAddress: FOOTER_ADDRESS,
  })

  if (DRY_RUN) {
    console.log("─".repeat(60))
    console.log(`TO:      ${prospect.email}`)
    console.log(`FROM:    ${FROM}`)
    console.log(`SUBJECT: ${tpl.subject}`)
    console.log(`HOOK SRC: ${source}`)
    console.log()
    console.log(tpl.text)
    console.log("─".repeat(60))
    return { dryRun: true, hook, source }
  }

  const result = await resend.emails.send({
    from: FROM,
    to: prospect.email,
    replyTo: REPLY_TO,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    tags: [
      { name: "campaign", value: "cold-outreach" },
      { name: "stage", value: "1-initial" },
      { name: "bucket", value: bucket.id },
    ],
    headers: { "X-Entity-Ref-ID": `cold-${bucket.id}-${prospect.domain}` },
  })

  if (result.error) {
    throw new Error(`Resend send error: ${JSON.stringify(result.error).slice(0, 200)}`)
  }

  return { id: result.data?.id, hook, source }
}

async function runTestMode() {
  const to = requireEnv.bind(null, "--to flag required in --test mode")
  if (!args.to) throw new Error("--test mode requires --to=<email>")
  if (!args["company-url"]) throw new Error("--test mode requires --company-url=<url>")

  const url = String(args["company-url"])
  const domain = new URL(url).hostname.replace(/^www\./, "")
  const fakeProspect = {
    email: String(args.to),
    firstName: String(args["first-name"] || "there"),
    lastName: "",
    position: "Founder",
    company: domain.split(".")[0],
    domain,
    url,
    bucket: BUCKET_ID,
  }

  const bucket = getBucket(BUCKET_ID)
  console.log(`[test] sending stage-1 to ${fakeProspect.email} for ${fakeProspect.company}`)
  const res = await sendStage1({ prospect: fakeProspect, bucket })
  console.log("[test] result:", res)
}

async function main() {
  if (TEST_MODE) {
    await runTestMode()
    return
  }

  const bucket = getBucket(BUCKET_ID)
  console.log(`[send] bucket=${BUCKET_ID} limit=${LIMIT} dry-run=${DRY_RUN}`)

  const all = readStore("prospects")
  const ready = all.filter(
    (p) => p.status === "enriched" && p.email && p.bucket === BUCKET_ID
  )
  console.log(`[send] ${ready.length} enriched prospects in bucket=${BUCKET_ID}`)

  let sent = 0
  let skipped = 0
  let errored = 0

  for (const prospect of ready.slice(0, LIMIT)) {
    // Defensive guards
    if (isRoleEmail(prospect.email)) {
      console.log(`  skip role-email: ${prospect.email}`)
      skipped++
      continue
    }
    if (isUnsubscribed(prospect.email)) {
      console.log(`  skip unsubscribed: ${prospect.email}`)
      skipped++
      continue
    }
    if (wasSentTo(prospect.email)) {
      console.log(`  skip already-sent: ${prospect.email}`)
      skipped++
      continue
    }

    try {
      const result = await sendStage1({ prospect, bucket })
      if (!DRY_RUN) {
        recordSent(prospect.email, {
          stage: 1,
          bucket: BUCKET_ID,
          resendId: result.id,
          hookSource: result.source,
          hook: result.hook,
        })
        // Update prospect status in-place
        const updated = readStore("prospects").map((p) =>
          p.email === prospect.email
            ? {
                ...p,
                status: "sent",
                stage1: { id: result.id, sentAt: new Date().toISOString() },
                updatedAt: new Date().toISOString(),
              }
            : p
        )
        writeStore("prospects", updated)
      }
      console.log(
        `  ✓ ${prospect.email}${result.id ? ` → ${result.id}` : ""} (hook: ${result.source})`
      )
      sent++
    } catch (err) {
      console.warn(`  ✗ ${prospect.email}: ${err.message}`)
      errored++
    }

    // Rate limit between sends
    if (!DRY_RUN && sent < LIMIT) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS))
    }
  }

  console.log(`[send] sent=${sent} skipped=${skipped} errored=${errored}`)
}

main().catch((err) => {
  console.error("[send] fatal:", err.message)
  process.exit(1)
})
