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

const CONFIRM = Boolean(args.confirm)
const LIMIT = Number(args.limit || 5)
const BUCKET = args.bucket || "saas"
const SKIP_DISCOVER = Boolean(args["skip-discover"])
const SKIP_ENRICH = Boolean(args["skip-enrich"])
const SKIP_SCHEDULE = Boolean(args["skip-schedule"])

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
