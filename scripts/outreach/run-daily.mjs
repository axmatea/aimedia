#!/usr/bin/env node
/**
 * Orchestrator: discover → enrich → send → schedule, in one pass.
 *
 * Usage:
 *   node scripts/outreach/run-daily.mjs                     # dry-run by default
 *   node scripts/outreach/run-daily.mjs --confirm           # actually send
 *   node scripts/outreach/run-daily.mjs --confirm --limit=5
 *   node scripts/outreach/run-daily.mjs --skip-discover     # use existing pool
 *
 * Defaults are intentionally conservative for warm-up:
 *   - 5 sends per run (matches Week 1 of warm-up curve)
 *   - SaaS bucket only
 *   - dry-run if --confirm not present
 */

import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { readStore } from "./lib/state.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=")
      return [k, v ?? true]
    }
    return [a, true]
  })
)

// ─── Hard safety caps ──────────────────────────────────────────────────────
// These cannot be overridden by CLI args. Protect domain reputation + comply
// with the warm-up curve before scaling.
const HARD_DAILY_CAP = 50            // never exceed 50 sends/day, regardless of --limit
const DOMAIN_COOLDOWN_DAYS = 14      // never email two contacts at same domain within 14 days
const WORK_HOUR_MIN = 10             // PT hour, inclusive
const WORK_HOUR_MAX = 16             // PT hour, exclusive

const CONFIRM = Boolean(args.confirm)
const REQUESTED_LIMIT = Number(args.limit || 5)
const LIMIT = Math.min(REQUESTED_LIMIT, HARD_DAILY_CAP)
const BUCKET = args.bucket || "saas"
const SKIP_DISCOVER = Boolean(args["skip-discover"])
const SKIP_ENRICH = Boolean(args["skip-enrich"])
const SKIP_SCHEDULE = Boolean(args["skip-schedule"])
const SKIP_WINDOW = Boolean(args["skip-window"])  // for testing only

if (REQUESTED_LIMIT > HARD_DAILY_CAP) {
  console.warn(`[orchestrator] --limit=${REQUESTED_LIMIT} exceeds hard cap of ${HARD_DAILY_CAP}/day — capping to ${HARD_DAILY_CAP}`)
}

// ─── Weekday + work-hours window ──────────────────────────────────────────
// Sends only fire Mon-Fri, 10:00-16:00 Pacific Time. Use --skip-window for
// dry-runs / testing outside hours.
function ptHour() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    hour12: false,
  })
  return Number(fmt.format(new Date()))
}

function ptWeekday() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
  })
  return fmt.format(new Date()) // "Mon", "Tue", … "Sun"
}

function inSendWindow() {
  const day = ptWeekday()
  if (day === "Sat" || day === "Sun") return { ok: false, reason: `weekend (${day} PT)` }
  const h = ptHour()
  if (h < WORK_HOUR_MIN || h >= WORK_HOUR_MAX) {
    return { ok: false, reason: `outside work hours (${h}:00 PT, allowed ${WORK_HOUR_MIN}:00-${WORK_HOUR_MAX}:00)` }
  }
  return { ok: true }
}

// ─── Per-domain cooldown ──────────────────────────────────────────────────
// Returns set of domains that have been sent to within DOMAIN_COOLDOWN_DAYS.
function recentlyEmailedDomains() {
  const sent = readStore("sent")
  const cutoff = Date.now() - DOMAIN_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  const out = new Set()
  for (const s of sent) {
    const ts = new Date(s.createdAt || s.sentAt || 0).getTime()
    if (ts < cutoff) continue
    const email = s.email || ""
    const at = email.lastIndexOf("@")
    if (at < 0) continue
    out.add(email.slice(at + 1).toLowerCase())
  }
  return out
}

function runScript(file, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, file)
    const child = spawn("node", [script, ...extraArgs], {
      stdio: "inherit",
      env: process.env,
    })
    child.on("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${file} exited ${code}`))
    })
    child.on("error", reject)
  })
}

function countByStatus() {
  const list = readStore("prospects")
  const tally = {}
  for (const p of list) tally[p.status || "unknown"] = (tally[p.status || "unknown"] || 0) + 1
  return tally
}

function header(title) {
  console.log("")
  console.log("═".repeat(60))
  console.log(`  ${title}`)
  console.log("═".repeat(60))
}

async function main() {
  console.log(`[orchestrator] bucket=${BUCKET} limit=${LIMIT} confirm=${CONFIRM}`)
  console.log("[orchestrator] starting pool state:", countByStatus())

  // ─── Window guard (hard block for live sends, allows dry-runs anytime) ───
  if (CONFIRM && !SKIP_WINDOW) {
    const w = inSendWindow()
    if (!w.ok) {
      console.error(`[orchestrator] refusing to run with --confirm: ${w.reason}`)
      console.error(`[orchestrator] override only for testing: --skip-window`)
      process.exit(2)
    }
  }

  // ─── Per-domain cooldown info ────────────────────────────────────────────
  const cooldown = recentlyEmailedDomains()
  if (cooldown.size > 0) {
    console.log(`[orchestrator] domains in cooldown (last ${DOMAIN_COOLDOWN_DAYS}d, skipped by send step): ${cooldown.size}`)
  }

  // ── 1. Discover ───────────────────────────────────────────────────────────
  if (!SKIP_DISCOVER) {
    header("STEP 1 — Discover")
    await runScript("discover-prospects.mjs", [
      `--bucket=${BUCKET}`,
      `--limit=${LIMIT * 4}`, // gather extra so enrichment has headroom
    ])
  } else {
    console.log("[orchestrator] --skip-discover set, skipping step 1")
  }

  // ── 2. Enrich ─────────────────────────────────────────────────────────────
  if (!SKIP_ENRICH) {
    header("STEP 2 — Enrich contacts")
    await runScript("enrich-contacts.mjs", [`--limit=${LIMIT * 2}`])
  } else {
    console.log("[orchestrator] --skip-enrich set, skipping step 2")
  }

  // ── 3. Personalize + send (gated by --confirm) ────────────────────────────
  header("STEP 3 — Personalize + send")
  const sendArgs = [`--bucket=${BUCKET}`, `--limit=${LIMIT}`]
  if (!CONFIRM) sendArgs.push("--dry-run")
  await runScript("personalize-and-send.mjs", sendArgs)

  // ── 4. Schedule follow-ups ────────────────────────────────────────────────
  if (CONFIRM && !SKIP_SCHEDULE) {
    header("STEP 4 — Schedule follow-ups")
    await runScript("schedule-followups.mjs", [`--limit=${LIMIT * 2}`])
  } else {
    console.log("[orchestrator] skipping step 4 (need --confirm and not --skip-schedule)")
  }

  console.log("")
  console.log("[orchestrator] final pool state:", countByStatus())
  console.log("[orchestrator] done")
}

main().catch((err) => {
  console.error("[orchestrator] fatal:", err.message)
  process.exit(1)
})
