#!/usr/bin/env node
/**
 * Enrich discovered prospects with email + name via Hunter.io.
 *
 * For each prospect with status="discovered" and no real email yet:
 *   1. Hunter Domain Search → get candidate decision-makers for the domain.
 *   2. Pick best contact (founder > CEO > CMO > head of growth, etc.).
 *   3. If confidence ≥ 80 and email is not a role/blacklisted prefix → keep.
 *   4. Replace the placeholder record with a real email-keyed record,
 *      status="enriched".
 *
 * Usage:
 *   node scripts/outreach/enrich-contacts.mjs [--limit=10]
 *
 * Env required:
 *   HUNTER_API_KEY   (hunter.io Starter plan, $49/mo, 1000 lookups)
 */

import { loadEnv, requireEnv } from "./lib/env.mjs"
import { readStore, writeStore } from "./lib/state.mjs"
import { ROLE_PRIORITY, isRoleEmail } from "./lib/icp-buckets.mjs"

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

const LIMIT = Number(args.limit || 10)
const MIN_CONFIDENCE = Number(args["min-confidence"] || 80)

const HUNTER_KEY = requireEnv("HUNTER_API_KEY", "Get one at hunter.io")

function rolePriorityIndex(position) {
  if (!position) return ROLE_PRIORITY.length + 1
  const p = position.toLowerCase()
  for (let i = 0; i < ROLE_PRIORITY.length; i++) {
    if (p.includes(ROLE_PRIORITY[i].toLowerCase())) return i
  }
  return ROLE_PRIORITY.length + 1
}

async function hunterDomainSearch(domain) {
  const url = new URL("https://api.hunter.io/v2/domain-search")
  url.searchParams.set("domain", domain)
  url.searchParams.set("api_key", HUNTER_KEY)
  url.searchParams.set("type", "personal")
  url.searchParams.set("limit", "10")

  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Hunter ${res.status} for ${domain}: ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  return data?.data?.emails || []
}

function pickBestContact(emails) {
  // Sort by role priority asc, then by confidence desc.
  const ranked = [...emails].sort((a, b) => {
    const ra = rolePriorityIndex(a.position)
    const rb = rolePriorityIndex(b.position)
    if (ra !== rb) return ra - rb
    return (b.confidence || 0) - (a.confidence || 0)
  })

  for (const candidate of ranked) {
    if (!candidate.value) continue
    if (isRoleEmail(candidate.value)) continue
    if ((candidate.confidence || 0) < MIN_CONFIDENCE) continue
    return candidate
  }
  return null
}

async function main() {
  console.log(`[enrich] limit=${LIMIT} min-confidence=${MIN_CONFIDENCE}`)
  const all = readStore("prospects")
  const pending = all.filter((p) => p.status === "discovered" && p.email?.startsWith("pending+"))
  console.log(`[enrich] ${pending.length} discovered prospects awaiting enrichment`)

  let enriched = 0
  let skipped = 0
  const updatedList = [...all]

  for (const prospect of pending.slice(0, LIMIT)) {
    if (!prospect.domain) {
      console.log(`  skip — no domain: ${prospect.email}`)
      skipped++
      continue
    }

    try {
      console.log(`  search → ${prospect.domain}`)
      const candidates = await hunterDomainSearch(prospect.domain)

      if (candidates.length === 0) {
        // Mark as exhausted so we don't keep retrying.
        const idx = updatedList.findIndex((p) => p.email === prospect.email)
        if (idx !== -1) {
          updatedList[idx] = {
            ...updatedList[idx],
            status: "no-contact-found",
            updatedAt: new Date().toISOString(),
          }
        }
        skipped++
        continue
      }

      const best = pickBestContact(candidates)
      if (!best) {
        const idx = updatedList.findIndex((p) => p.email === prospect.email)
        if (idx !== -1) {
          updatedList[idx] = {
            ...updatedList[idx],
            status: "low-confidence",
            candidateCount: candidates.length,
            updatedAt: new Date().toISOString(),
          }
        }
        skipped++
        continue
      }

      // Remove placeholder, insert enriched record.
      const remaining = updatedList.filter((p) => p.email !== prospect.email)
      const enrichedRecord = {
        ...prospect,
        email: best.value,
        firstName: best.first_name,
        lastName: best.last_name,
        position: best.position,
        linkedin: best.linkedin,
        confidence: best.confidence,
        status: "enriched",
        updatedAt: new Date().toISOString(),
      }
      remaining.push(enrichedRecord)
      updatedList.length = 0
      updatedList.push(...remaining)
      enriched++
      console.log(
        `    ✓ ${best.first_name || "?"} ${best.last_name || ""} <${best.value}> (${best.position || "?"}, ${best.confidence}%)`
      )
    } catch (err) {
      console.warn(`  err ${prospect.domain}: ${err.message}`)
      skipped++
    }

    // Polite delay — Hunter rate-limits to 15 req/sec on Starter.
    await new Promise((r) => setTimeout(r, 800))
  }

  writeStore("prospects", updatedList)
  console.log(`[enrich] enriched=${enriched} skipped=${skipped}`)
}

main().catch((err) => {
  console.error("[enrich] fatal:", err.message)
  process.exit(1)
})
