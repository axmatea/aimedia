#!/usr/bin/env node
/**
 * Seed prospects.json with a hand-curated list of indie SaaS founders.
 *
 * These are real, public-facing B2B SaaS founders whose company domains
 * use the firstname@domain.com pattern (best-effort guess). Bounce risk
 * is real — we cap at 5 for the first batch to protect domain reputation.
 *
 * Status is set to "enriched" so personalize-and-send.mjs will pick them
 * up on its next run.
 *
 * Usage:
 *   node scripts/outreach/seed-prospects.mjs            # appends to existing
 *   node scripts/outreach/seed-prospects.mjs --reset    # overwrites file
 */

import { readStore, writeStore, findByEmail } from "./lib/state.mjs"

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=")
      return [k, v ?? true]
    }
    return [a, true]
  })
)

const RESET = Boolean(args.reset)

/**
 * Hand-curated indie SaaS founder targets.
 *
 * Picked for:
 *   - small-to-mid indie SaaS (not the hot YC startups that get blasted)
 *   - public founder identity
 *   - clear "firstname@domain" email pattern likely
 *   - actively building, ideal AI Media client profile
 */
const CURATED = [
  {
    email: "tyler@beehiiv.com",
    firstName: "Tyler",
    lastName: "Denk",
    company: "beehiiv",
    domain: "beehiiv.com",
    url: "https://beehiiv.com",
    position: "Co-Founder & CEO",
    linkedin: "https://www.linkedin.com/in/tylerdenk/",
    bucket: "saas",
    status: "enriched",
    confidence: 70,
  },
  {
    email: "marie@tally.so",
    firstName: "Marie",
    lastName: "Martens",
    company: "Tally",
    domain: "tally.so",
    url: "https://tally.so",
    position: "Co-Founder",
    linkedin: "https://www.linkedin.com/in/mariemartens/",
    bucket: "saas",
    status: "enriched",
    confidence: 70,
  },
  {
    email: "jesse@bentonow.com",
    firstName: "Jesse",
    lastName: "Hanley",
    company: "Bento",
    domain: "bentonow.com",
    url: "https://bentonow.com",
    position: "Founder",
    linkedin: "https://www.linkedin.com/in/jessethanley/",
    bucket: "saas",
    status: "enriched",
    confidence: 65,
  },
  {
    email: "chris@loops.so",
    firstName: "Chris",
    lastName: "Frantz",
    company: "Loops",
    domain: "loops.so",
    url: "https://loops.so",
    position: "Co-Founder & CEO",
    linkedin: "https://www.linkedin.com/in/chrisfrantz/",
    bucket: "saas",
    status: "enriched",
    confidence: 70,
  },
  {
    email: "pat@starterstory.com",
    firstName: "Pat",
    lastName: "Walls",
    company: "Starter Story",
    domain: "starterstory.com",
    url: "https://starterstory.com",
    position: "Founder",
    linkedin: "https://www.linkedin.com/in/pat-walls/",
    bucket: "saas",
    status: "enriched",
    confidence: 70,
  },
]

function main() {
  if (RESET) {
    writeStore("prospects", CURATED)
    console.log(`Reset prospects.json with ${CURATED.length} curated prospects`)
    return
  }

  const existing = readStore("prospects")
  let added = 0
  let skipped = 0

  for (const p of CURATED) {
    if (findByEmail("prospects", p.email)) {
      skipped++
      continue
    }
    existing.push({ ...p, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    added++
  }

  writeStore("prospects", existing)
  console.log(`Seeded: ${added} added, ${skipped} already existed`)
}

main()
