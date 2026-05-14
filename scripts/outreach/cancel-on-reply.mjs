#!/usr/bin/env node
/**
 * Cancel scheduled follow-ups when a prospect replies (or you want to stop).
 *
 * Usage:
 *   node scripts/outreach/cancel-on-reply.mjs --email=prospect@example.com [--reason=replied]
 *
 *   # Bulk: cancel everyone in a campaign by bucket
 *   node scripts/outreach/cancel-on-reply.mjs --bucket=saas --all
 *
 * Env:
 *   RESEND_API_KEY
 */

import { Resend } from "resend"
import { loadEnv, requireEnv } from "./lib/env.mjs"
import { readStore, writeStore, addUnsubscribe } from "./lib/state.mjs"

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

const resend = new Resend(requireEnv("RESEND_API_KEY"))

async function cancelOne(id) {
  if (!id) return { skipped: true }
  try {
    const r = await resend.emails.cancel(id)
    return { id, cancelled: true, raw: r.data?.id }
  } catch (err) {
    return { id, cancelled: false, error: err?.message || String(err) }
  }
}

async function cancelForProspect(prospect, reason) {
  const s2 = await cancelOne(prospect.stage2?.id)
  const s3 = await cancelOne(prospect.stage3?.id)
  return { s2, s3, reason }
}

async function main() {
  const TARGET_EMAIL = args.email ? String(args.email).toLowerCase().trim() : null
  const TARGET_BUCKET = args.bucket || null
  const ALL = Boolean(args.all)
  const REASON = String(args.reason || "replied")
  const SHOULD_UNSUBSCRIBE = Boolean(args.unsubscribe)

  const list = readStore("prospects")
  let targets = []

  if (TARGET_EMAIL) {
    targets = list.filter((p) => p.email?.toLowerCase().trim() === TARGET_EMAIL)
  } else if (TARGET_BUCKET && ALL) {
    targets = list.filter((p) => p.bucket === TARGET_BUCKET && p.status === "scheduled")
  } else {
    console.error("Pass --email=... OR --bucket=... --all")
    process.exit(1)
  }

  if (targets.length === 0) {
    console.log("No matching prospects")
    return
  }

  console.log(`[cancel] ${targets.length} prospect(s), reason=${REASON}`)

  let cancelled = 0
  for (const prospect of targets) {
    const result = await cancelForProspect(prospect, REASON)
    console.log(`  ${prospect.email}: stage2=${result.s2.cancelled ? "✓" : "—"} stage3=${result.s3.cancelled ? "✓" : "—"}`)

    // Update state
    const updated = readStore("prospects").map((p) =>
      p.email === prospect.email
        ? {
            ...p,
            status: REASON === "replied" ? "replied" : "stopped",
            stoppedAt: new Date().toISOString(),
            stopReason: REASON,
            updatedAt: new Date().toISOString(),
          }
        : p
    )
    writeStore("prospects", updated)

    if (SHOULD_UNSUBSCRIBE) {
      addUnsubscribe(prospect.email, REASON)
      console.log(`    + added to unsubscribes (${REASON})`)
    }

    cancelled++
  }

  console.log(`[cancel] done. ${cancelled} prospect(s) updated.`)
}

main().catch((err) => {
  console.error("[cancel] fatal:", err.message)
  process.exit(1)
})
