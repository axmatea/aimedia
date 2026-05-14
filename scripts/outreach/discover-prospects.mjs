#!/usr/bin/env node
/**
 * Discover prospects for a given ICP bucket.
 *
 * Pipeline:
 *   1. For each search query in the bucket, hit Brave Search API.
 *   2. Dedupe hits by company domain.
 *   3. Run results through Claude Haiku to filter to qualifying companies
 *      and extract a 1-line "why it fits" reason.
 *   4. Upsert into data/outreach/prospects.json with status="discovered".
 *
 * Usage:
 *   node scripts/outreach/discover-prospects.mjs --bucket=saas --limit=20 [--dry-run]
 *
 * Env required:
 *   BRAVE_SEARCH_API_KEY   (free tier: 2000 queries/mo, brave.com/search/api)
 *   ANTHROPIC_API_KEY      (Claude Haiku 4.5 for filtering)
 */

import { loadEnv, requireEnv, optionalEnv } from "./lib/env.mjs"
import { getBucket } from "./lib/icp-buckets.mjs"
import { upsertByEmail, readStore, writeStore } from "./lib/state.mjs"

loadEnv()

// ── Args ────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=")
      return [k, v ?? true]
    }
    return [a, true]
  })
)

const BUCKET_ID = args.bucket || "saas"
const LIMIT = Number(args.limit || 20)
const DRY_RUN = Boolean(args["dry-run"])

const bucket = getBucket(BUCKET_ID)

// ── Brave Search ────────────────────────────────────────────────────────────
async function braveSearch(query, count = 10) {
  const key = requireEnv("BRAVE_SEARCH_API_KEY", "Get one at brave.com/search/api")
  const url = new URL("https://api.search.brave.com/res/v1/web/search")
  url.searchParams.set("q", query)
  url.searchParams.set("count", String(count))
  url.searchParams.set("safesearch", "moderate")

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": key,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Brave Search failed (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  return (data?.web?.results || []).map((r) => ({
    title: r.title,
    description: r.description,
    url: r.url,
  }))
}

function extractDomain(url) {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, "").toLowerCase()
  } catch {
    return null
  }
}

// Domains we should never bother enriching.
const DOMAIN_BLOCKLIST = new Set([
  "linkedin.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "medium.com",
  "substack.com",
  "github.com",
  "wikipedia.org",
  "crunchbase.com",
  "techcrunch.com",
  "reddit.com",
  "producthunt.com",
  "ycombinator.com",
  "news.ycombinator.com",
])

// ── Claude filter ───────────────────────────────────────────────────────────
async function filterWithClaude(candidates, bucketDef) {
  const key = requireEnv("ANTHROPIC_API_KEY", "Set ANTHROPIC_API_KEY in .env")
  const model = optionalEnv("ANTHROPIC_HAIKU_MODEL", "claude-haiku-4-5")

  const system = `You filter prospect candidates for a B2B outbound campaign.

Target ICP for this run: "${bucketDef.description}".

Must be: ${bucketDef.filterRules?.mustBe?.join(", ") || "qualifying company in the segment"}
Must NOT be: ${bucketDef.filterRules?.mustNotBe?.join(", ") || "anything outside the segment"}

For each candidate, return JSON: { domain, company, fit (yes/no), reason (one short sentence) }.
If "fit" is "no", be brief — just say why it doesn't qualify.
Only mark "yes" if you're confident this is a real company in the target segment.

Return ONLY a JSON array, no preamble.`

  const user = `Candidates:\n${JSON.stringify(candidates, null, 2)}`

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Claude API failed (${res.status}): ${text.slice(0, 300)}`)
  }

  const data = await res.json()
  const content = data?.content?.[0]?.text || "[]"
  // Strip code fences if Claude wrapped it.
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim()
  try {
    return JSON.parse(cleaned)
  } catch (err) {
    throw new Error(`Claude returned non-JSON: ${cleaned.slice(0, 200)}`)
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[discover] bucket=${BUCKET_ID} limit=${LIMIT} dry-run=${DRY_RUN}`)

  // 1. Collect raw search hits from all queries
  const raw = []
  for (const query of bucket.searchQueries) {
    try {
      const hits = await braveSearch(query, 10)
      console.log(`[search] "${query}" → ${hits.length} hits`)
      raw.push(...hits)
    } catch (err) {
      console.warn(`[search] query failed: "${query}" — ${err.message}`)
    }
    // Be polite to Brave (rate limit-friendly).
    await new Promise((r) => setTimeout(r, 1100))
  }

  // 2. Dedupe by domain, filter blocklisted
  const byDomain = new Map()
  for (const hit of raw) {
    const domain = extractDomain(hit.url)
    if (!domain) continue
    if (DOMAIN_BLOCKLIST.has(domain)) continue
    if (byDomain.has(domain)) continue
    byDomain.set(domain, {
      domain,
      url: `https://${domain}`,
      title: hit.title,
      description: hit.description,
    })
    if (byDomain.size >= LIMIT * 3) break // gather extra so Claude can prune
  }
  const candidates = Array.from(byDomain.values())
  console.log(`[dedupe] ${candidates.length} unique domains after blocklist`)

  if (candidates.length === 0) {
    console.log("[discover] no candidates — exiting")
    return
  }

  // 3. Claude filter
  const filtered = await filterWithClaude(candidates, bucket)
  const fits = filtered.filter((c) => String(c.fit).toLowerCase() === "yes").slice(0, LIMIT)
  console.log(`[filter] ${fits.length} qualified / ${filtered.length} reviewed`)

  // 4. Persist (unless dry-run)
  if (DRY_RUN) {
    console.log("[dry-run] would persist:", JSON.stringify(fits, null, 2))
    return
  }

  // We don't yet have emails — use the domain as a temporary key so enrichment
  // can find these later. The state helpers key on `email`, so we use
  // `pending+<domain>@discovered.local` as a placeholder until enriched.
  let inserted = 0
  let updated = 0
  for (const f of fits) {
    if (!f.domain) continue
    const placeholderEmail = `pending+${f.domain}@discovered.local`
    const result = upsertByEmail("prospects", {
      email: placeholderEmail,
      domain: f.domain,
      url: `https://${f.domain}`,
      company: f.company || f.domain,
      bucket: BUCKET_ID,
      status: "discovered",
      fitReason: f.reason,
    })
    if (result === "inserted") inserted++
    else updated++
  }

  console.log(`[persist] inserted=${inserted} updated=${updated} → data/outreach/prospects.json`)
}

main().catch((err) => {
  console.error("[discover] fatal:", err.message)
  process.exit(1)
})
