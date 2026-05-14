#!/usr/bin/env node
/**
 * Schedule the Day +3 bump and Day +10 final via Resend scheduledAt.
 *
 * For each prospect with status="sent" that doesn't yet have stage2/stage3 IDs:
 *   1. Compute scheduled-at timestamps based on stage1.sentAt.
 *      - Day +3 at 10:00 PT (next business day if +3 lands on weekend)
 *      - Day +10 at 10:00 PT (next business day)
 *   2. Create Resend scheduled sends with templates stage2 + stage3.
 *   3. Save IDs to campaigns.json so we can cancel on reply.
 *   4. Update prospect status="scheduled".
 *
 * Usage:
 *   node scripts/outreach/schedule-followups.mjs [--limit=20]
 *
 * Env required:
 *   RESEND_API_KEY, FROM_EMAIL
 */

import { Resend } from "resend"
import { loadEnv, requireEnv, optionalEnv } from "./lib/env.mjs"
import { stage2, stage3 } from "./lib/email-templates.mjs"
import { readStore, writeStore, upsertByEmail } from "./lib/state.mjs"

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

const LIMIT = Number(args.limit || 20)

const FROM = optionalEnv("FROM_EMAIL", "AI Media <info@aimedia.global>")
const REPLY_TO = optionalEnv("REPLY_TO_EMAIL", "info@aimedia.global")
const FOOTER_ADDRESS = optionalEnv(
  "FOOTER_ADDRESS",
  "AX Media Co · Los Angeles, CA · USA"
)

const resend = new Resend(requireEnv("RESEND_API_KEY"))

/**
 * Compute the scheduled-at ISO timestamp:
 *   baseISO + daysOffset, at 10:00 in America/Los_Angeles.
 *   If the resulting date is Sat/Sun, push forward to Monday.
 */
function scheduleAt(baseISO, daysOffset) {
  const base = new Date(baseISO)
  if (Number.isNaN(base.getTime())) {
    throw new Error(`Invalid base ISO: ${baseISO}`)
  }
  // Convert "base" to a calendar date in PT, then advance days.
  // Simple approach: take YYYY-MM-DD of base in PT, advance, set hour 10 PT.
  const pt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base)
  const [year, month, day] = pt.split("-").map(Number)

  // Build a Date in PT at 10:00 by using offset string.
  // PDT = UTC-7 (Mar-Nov), PST = UTC-8 (Nov-Mar). Use the broad offset for
  // 10am PT — we'll let Resend correct sub-hour if needed.
  // Simpler: construct a UTC date with `Z` then subtract 7 hours.
  let target = new Date(Date.UTC(year, month - 1, day + daysOffset, 17, 0, 0)) // 10am PT = 17:00 UTC (PDT)

  // Push past weekends.
  const dow = target.getUTCDay() // 0=Sun, 6=Sat
  if (dow === 6) target = new Date(target.getTime() + 2 * 86400 * 1000)
  else if (dow === 0) target = new Date(target.getTime() + 1 * 86400 * 1000)

  // Never schedule in the past — push to "now + 60s" if so.
  const now = new Date()
  if (target.getTime() <= now.getTime() + 60_000) {
    target = new Date(now.getTime() + 60_000)
  }

  return target.toISOString()
}

async function scheduleOne(prospect) {
  if (!prospect.stage1?.sentAt) {
    throw new Error("missing stage1.sentAt")
  }

  const base = prospect.stage1.sentAt
  const day3At = scheduleAt(base, 3)
  const day10At = scheduleAt(base, 10)

  const tpl2 = stage2({
    firstName: prospect.firstName || "there",
    company: prospect.company || prospect.domain,
    footerAddress: FOOTER_ADDRESS,
  })
  const tpl3 = stage3({
    firstName: prospect.firstName || "there",
    footerAddress: FOOTER_ADDRESS,
  })

  const tagBase = [
    { name: "campaign", value: "cold-outreach" },
    { name: "bucket", value: prospect.bucket || "saas" },
  ]

  const day3 = await resend.emails.send({
    from: FROM,
    to: prospect.email,
    replyTo: REPLY_TO,
    subject: tpl2.subject,
    html: tpl2.html,
    text: tpl2.text,
    scheduledAt: day3At,
    tags: [...tagBase, { name: "stage", value: "2-bump" }],
    headers: { "X-Entity-Ref-ID": `cold-${prospect.bucket || "saas"}-${prospect.domain}-bump` },
  })
  if (day3.error) throw new Error(`day3 schedule error: ${JSON.stringify(day3.error).slice(0, 200)}`)

  const day10 = await resend.emails.send({
    from: FROM,
    to: prospect.email,
    replyTo: REPLY_TO,
    subject: tpl3.subject,
    html: tpl3.html,
    text: tpl3.text,
    scheduledAt: day10At,
    tags: [...tagBase, { name: "stage", value: "3-final" }],
    headers: { "X-Entity-Ref-ID": `cold-${prospect.bucket || "saas"}-${prospect.domain}-final` },
  })
  if (day10.error) throw new Error(`day10 schedule error: ${JSON.stringify(day10.error).slice(0, 200)}`)

  return {
    stage2: { id: day3.data?.id, scheduledAt: day3At },
    stage3: { id: day10.data?.id, scheduledAt: day10At },
  }
}

async function main() {
  console.log(`[schedule] limit=${LIMIT}`)
  const all = readStore("prospects")
  const ready = all.filter((p) => p.status === "sent" && p.stage1?.sentAt && !p.stage2)
  console.log(`[schedule] ${ready.length} prospects need stage 2 + 3 scheduling`)

  let scheduled = 0
  let errored = 0

  for (const prospect of ready.slice(0, LIMIT)) {
    try {
      const { stage2: s2, stage3: s3 } = await scheduleOne(prospect)
      const list = readStore("prospects").map((p) =>
        p.email === prospect.email
          ? {
              ...p,
              status: "scheduled",
              stage2: s2,
              stage3: s3,
              updatedAt: new Date().toISOString(),
            }
          : p
      )
      writeStore("prospects", list)

      upsertByEmail("campaigns", {
        email: prospect.email,
        domain: prospect.domain,
        company: prospect.company,
        bucket: prospect.bucket,
        stage1: prospect.stage1,
        stage2: s2,
        stage3: s3,
        status: "active",
      })

      console.log(`  ✓ ${prospect.email} — stage2 ${s2.scheduledAt} / stage3 ${s3.scheduledAt}`)
      scheduled++
    } catch (err) {
      console.warn(`  ✗ ${prospect.email}: ${err.message}`)
      errored++
    }
  }

  console.log(`[schedule] scheduled=${scheduled} errored=${errored}`)
}

main().catch((err) => {
  console.error("[schedule] fatal:", err.message)
  process.exit(1)
})
