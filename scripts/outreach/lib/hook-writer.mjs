/**
 * AI hook writer: Claude Haiku fetches the prospect's homepage,
 * extracts something concrete to reference, and drafts a 1–2 sentence
 * personalized opener that doesn't read like a template.
 *
 * Returns { hook, source } where `source` is the bit of homepage Claude
 * pulled from (so we can audit / debug bad hooks).
 */

import { optionalEnv } from "./env.mjs"

const FETCH_TIMEOUT_MS = 15_000
const MAX_HOMEPAGE_CHARS = 6000

async function fetchHomepage(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 AI-Media-Researcher/1.0",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    return stripHtml(html).slice(0, MAX_HOMEPAGE_CHARS)
  } finally {
    clearTimeout(timer)
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Deterministic small-int hash. Same email → always picks the same variant,
 * so the prospect can't compare two different sends and notice rotation.
 */
function pickVariant(email, variants) {
  let h = 0
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) | 0
  return variants[Math.abs(h) % variants.length]
}

/**
 * Bucket-aware fallback opener. Used when Anthropic isn't configured OR
 * when the homepage fetch fails. 4 phrasings × deterministic pick = no two
 * prospects in the same batch read identically.
 */
function fallbackOpener({ prospect, bucket }) {
  const co = prospect.company
  const fn = prospect.firstName

  // bucket-specific tells — different prospects in different buckets read different stories
  const tells = {
    saas: [
      `${co} caught my eye — looks like you're at the stage where founder-led outbound stops scaling and adding an SDR doesn't fix it.`,
      `${fn}, quick read on ${co} — solid product, but the math on growth tends to break right around the team size you're at.`,
      `Reason I'm in your inbox: ${co} sits in the zone where the next $1M of ARR costs more time than it should — and that's usually a leverage problem, not a market one.`,
      `Been tracking lean B2B SaaS like ${co} for a while — the bottleneck almost always shows up at the same spot, and it's not the product.`,
    ],
    web3: [
      `${co} is in the lane where token launches lean on community velocity — and most teams burn out trying to keep up manually.`,
      `${fn}, watching ${co} — the gap between launch attention and post-launch retention usually decides who survives the next cycle.`,
      `Reason for reaching out: ${co} sits in the segment where AI-driven community ops is the difference between a one-week hype window and a real funnel.`,
      `Been seeing the same pattern across DAOs and protocols like ${co} — content + community ops can't stay manual past a certain size.`,
    ],
    agency: [
      `${co} caught my eye — agencies your size usually hit the same ceiling: output is capped by people, and hiring out of it kills margins.`,
      `${fn}, ${co} reads like the kind of shop that's billing well but stuck because every extra client = another hire.`,
      `Reason I'm writing: ${co} sits in the spot where AI ops let you 3× output without 3× the team, but most agencies don't pull the trigger.`,
      `Most boutique agencies like ${co} we see hit the same wall — service quality is fine, but throughput becomes the lid on revenue.`,
    ],
    dtc: [
      `${co} is in the bracket where content + ad-creative volume becomes the actual bottleneck — not media spend.`,
      `${fn}, watching ${co} — DTC brands your size usually plateau when manual creative production can't keep up with the testing budget.`,
      `Reason for the note: ${co} sits in the zone where the next CAC win comes from creative velocity, not another ad agency.`,
      `Most premium DTC brands like ${co} hit the same point — your team can produce great content, just not enough of it to feed the machine.`,
    ],
  }

  const variants = tells[bucket.id] || tells.saas
  return pickVariant(prospect.email || prospect.domain || co, variants)
}

/**
 * Given a prospect record + bucket definition, return a personalized hook.
 * Falls back to a bucket-level pain-point opener if the homepage fails.
 */
export async function writeHook({ prospect, bucket }) {
  let homepageText = ""
  let source = "fetch-failed"
  try {
    homepageText = await fetchHomepage(prospect.url || `https://${prospect.domain}`)
    source = "homepage"
  } catch (err) {
    homepageText = ""
    source = `fetch-failed: ${err.message}`
  }

  if (!homepageText || homepageText.length < 200) {
    return { hook: fallbackOpener({ prospect, bucket }), source: "fallback-no-homepage" }
  }

  // ANTHROPIC_API_KEY is optional. Without it, ship the fallback hook —
  // useful for QA / test sends before the real key is wired.
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { hook: fallbackOpener({ prospect, bucket }), source: "fallback-no-anthropic" }
  }
  const model = optionalEnv("ANTHROPIC_HAIKU_MODEL", "claude-haiku-4-5")

  const system = `You are a cold-email opener writer.

You will be given:
1. A B2B prospect company (name, domain, role of the contact, their first name).
2. ~6KB of cleaned homepage text from that company.
3. The ICP bucket we're pitching them as.

Write exactly ONE opener sentence (max ~22 words). It must:
- Reference something CONCRETE from the homepage — a specific product, recent launch, positioning, named feature, a stated promise.
- Sound like a real human read their site. NOT generic praise like "love what you're building".
- NOT mention "AI", "I'm reaching out", or "your team".
- NOT compliment them in a sycophantic way.
- NOT include a CTA — just the observation.

If the homepage is too vague to find anything concrete, write a sentence that flags the segment they're in instead of inventing details.

Return ONLY the sentence, no quotes, no preamble.`

  const user = `Company: ${prospect.company}
Domain: ${prospect.domain}
Contact: ${prospect.firstName} ${prospect.lastName || ""} (${prospect.position || "decision-maker"})
ICP bucket: ${bucket.description}

Homepage text:
"""
${homepageText}
"""

Write the opener now.`

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 200,
      system,
      messages: [{ role: "user", content: user }],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Claude hook API failed (${res.status}): ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const raw = data?.content?.[0]?.text?.trim() || ""
  // Strip surrounding quotes if Claude added them.
  const hook = raw.replace(/^["'`]/, "").replace(/["'`]$/, "").trim()
  if (!hook) return { hook: fallbackOpener({ prospect, bucket }), source: "fallback-claude-empty" }
  return { hook, source }
}
