#!/usr/bin/env node
/**
 * One-glance status of the outreach pipeline.
 *
 *   node scripts/outreach/status.mjs
 *
 * Reads data/outreach/{prospects,sent,campaigns,unsubscribes}.json and
 * prints: pool by status, sent log summary, upcoming scheduled sends,
 * and any health warnings.
 */

import { loadEnv } from "./lib/env.mjs"
import { readStore } from "./lib/state.mjs"

loadEnv()

function fmtDate(iso) {
  if (!iso) return "—"
  return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC"
}

function header(t) {
  console.log("")
  console.log("═".repeat(70))
  console.log(`  ${t}`)
  console.log("═".repeat(70))
}

function tally(arr, keyFn) {
  const out = {}
  for (const x of arr) {
    const k = keyFn(x) || "?"
    out[k] = (out[k] || 0) + 1
  }
  return out
}

const prospects = readStore("prospects")
const sent = readStore("sent")
const campaigns = readStore("campaigns")
const unsubs = readStore("unsubscribes")

header("AI MEDIA · OUTREACH STATUS")
console.log(`Generated:    ${fmtDate(new Date().toISOString())}`)
console.log(`Prospects:    ${prospects.length}`)
console.log(`Sent log:     ${sent.length}`)
console.log(`Campaigns:    ${campaigns.length}`)
console.log(`Unsubscribed: ${unsubs.length}`)

header("Pool by status")
const byStatus = tally(prospects, (p) => p.status)
for (const [k, v] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(20)} ${v}`)
}

header("Pool by bucket")
const byBucket = tally(prospects, (p) => p.bucket)
for (const [k, v] of Object.entries(byBucket).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(20)} ${v}`)
}

header("Recent sends (latest 10)")
const recent = [...sent]
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  .slice(0, 10)
if (!recent.length) {
  console.log("  (no sends yet)")
} else {
  for (const s of recent) {
    console.log(`  [stage ${s.stage}] ${fmtDate(s.createdAt)} → ${s.email}`)
    console.log(`    hook src: ${s.hookSource}`)
  }
}

header("Hook quality breakdown")
const hookSources = tally(sent, (s) => s.hookSource)
for (const [k, v] of Object.entries(hookSources).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(28)} ${v}`)
}
if ((hookSources["fallback-no-anthropic"] || 0) > 0) {
  console.log("")
  console.log("  ⚠️  Sends used the fallback opener — set ANTHROPIC_API_KEY in")
  console.log("     .env.production.local for fully personalized hooks.")
}

header("Upcoming scheduled (future-dated)")
const upcoming = []
for (const p of prospects) {
  for (const stage of ["stage2", "stage3"]) {
    const s = p[stage]
    if (s?.scheduledAt && new Date(s.scheduledAt) > new Date()) {
      upcoming.push({ email: p.email, stage, when: s.scheduledAt, id: s.id })
    }
  }
}
upcoming.sort((a, b) => new Date(a.when) - new Date(b.when))
if (!upcoming.length) {
  console.log("  (no scheduled follow-ups)")
} else {
  for (const u of upcoming.slice(0, 20)) {
    console.log(`  ${fmtDate(u.when)}  ${u.stage}  ${u.email}`)
  }
  if (upcoming.length > 20) console.log(`  … and ${upcoming.length - 20} more`)
}

header("Health check")
const haveResend = Boolean(process.env.RESEND_API_KEY)
const haveAnthropic = Boolean(process.env.ANTHROPIC_API_KEY)
const haveBrave = Boolean(process.env.BRAVE_SEARCH_API_KEY)
const haveHunter = Boolean(process.env.HUNTER_API_KEY)
const haveFooter = Boolean(process.env.FOOTER_ADDRESS)

const row = (label, ok, note) =>
  console.log(`  ${ok ? "✅" : "❌"} ${label.padEnd(22)} ${note || ""}`)

row("RESEND_API_KEY", haveResend, "required — sends + schedules")
row("ANTHROPIC_API_KEY", haveAnthropic, haveAnthropic ? "" : "fallback opener will be used")
row("BRAVE_SEARCH_API_KEY", haveBrave, haveBrave ? "" : "auto-discover disabled")
row("HUNTER_API_KEY", haveHunter, haveHunter ? "" : "auto-enrich disabled")
row("FOOTER_ADDRESS", haveFooter, haveFooter ? "" : "CAN-SPAM: using default")

console.log("")

if (!haveBrave || !haveHunter) {
  header("Next action to unblock daily auto-pipeline")
  console.log("  1) Get BRAVE_SEARCH_API_KEY — brave.com/search/api (free tier 2000/mo)")
  console.log("  2) Get HUNTER_API_KEY — hunter.io ($49/mo, 1000 lookups)")
  console.log("  3) Add to .env.production.local")
  console.log("  4) Run:  node scripts/outreach/run-daily.mjs --confirm --limit=5")
  console.log("")
  console.log("  OR manually seed prospects: edit seed-prospects.mjs, then:")
  console.log("       node scripts/outreach/seed-prospects.mjs")
  console.log("       node scripts/outreach/personalize-and-send.mjs --confirm --bucket=saas --limit=5")
  console.log("       node scripts/outreach/schedule-followups.mjs --limit=10")
}
