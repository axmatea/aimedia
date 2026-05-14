/**
 * ICP (Ideal Customer Profile) buckets — the AI Media target segments.
 *
 * Each bucket defines:
 *   - searchQueries: Brave Search queries to discover candidates
 *   - filterRules: rules used by discovery agent to qualify hits
 *   - painPoint: the value-prop angle used in the email body
 *   - caseStudy: a real case study from page.tsx to reference for credibility
 *   - icpLabel: matches the WHO_WE_SERVE labels on aimedia.global
 *
 * For MVP we only ship the SaaS bucket. Other buckets are scaffolded
 * but commented out so we can flip them on later without restructuring.
 */

export const ROLE_PRIORITY = [
  "Founder",
  "Co-Founder",
  "CEO",
  "Chief Executive Officer",
  "Head of Growth",
  "VP Growth",
  "VP Marketing",
  "Head of Marketing",
  "CMO",
  "Chief Marketing Officer",
]

export const BUCKETS = {
  saas: {
    id: "saas",
    icpLabel: "SaaS & Products",
    description: "B2B SaaS founders pre-Series B, $200K–$5M ARR, lean team",
    searchQueries: [
      "B2B SaaS founders raised seed 2024 2025",
      "SaaS pre-Series B founder lead generation",
      "B2B SaaS startup launch 2025 site:producthunt.com",
      "SaaS founder $1M ARR struggling with outbound",
      "Y Combinator SaaS 2024 batch",
      "indie B2B SaaS founders 2025",
    ],
    filterRules: {
      mustBe: ["B2B", "SaaS or software product"],
      mustNotBe: [
        "enterprise (Series C+)",
        "agency",
        "consultancy",
        "freelancer",
        "marketplace without software",
        "consumer-only app",
      ],
      employeeRange: { min: 2, max: 75 },
    },
    painPoint:
      "growth motion is still founder-driven outbound + a part-time SDR — the math doesn't scale past where you are",
    promiseLine:
      "AI-built lead gen + outbound infrastructure that runs without adding headcount",
    caseStudy: {
      project: "AfterCall",
      tag: "SaaS",
      result: "$180k ARR in the first 90 days from automated pipeline",
    },
  },

  // Other buckets scaffolded — set `enabled: true` when ready to ship.
  web3: {
    id: "web3",
    enabled: false,
    icpLabel: "Web3 Projects",
    description: "DAOs, NFT studios, DeFi protocols with growth budget",
    painPoint: "community growth + token-launch attention without a generic Web3 agency",
    promiseLine: "AI-built community engine + content velocity for token / NFT launches",
    caseStudy: {
      project: "XWECAN",
      tag: "Web3",
      result: "2,200 qualified leads contacted before launch day",
    },
  },

  agency: {
    id: "agency",
    enabled: false,
    icpLabel: "Agencies",
    description: "Boutique marketing/creative agencies scaling content",
    painPoint: "you're capped by team size; AI ops let you 3× output without 3× hires",
    promiseLine: "white-label AI content + ops infrastructure for your client roster",
    caseStudy: {
      project: "1SecondCopy",
      tag: "Content Agency",
      result: "3× more booked calls per week without adding headcount",
    },
  },

  dtc: {
    id: "dtc",
    enabled: false,
    icpLabel: "DTC Brands",
    description: "Shopify DTC brands $1M–$10M ARR, fashion / wellness / premium",
    painPoint: "content + ad-creative volume is the bottleneck — manual production is too slow",
    promiseLine: "AI content engine + ad creative pipeline tuned to your brand voice",
    caseStudy: {
      project: "Dad's Printing",
      tag: "Local Business",
      result: "CAC dropped 67%. AI handles the full pipeline",
    },
  },
}

export const ENABLED_BUCKETS = Object.values(BUCKETS).filter((b) => b.enabled !== false)

export function getBucket(id) {
  const b = BUCKETS[id]
  if (!b) throw new Error(`Unknown bucket: ${id}. Valid: ${Object.keys(BUCKETS).join(", ")}`)
  return b
}

/**
 * Hard skip list: role-based / generic inbox prefixes we should never email.
 * Reject if the local-part exactly equals one of these or starts with `<prefix>+`.
 */
export const HARD_SKIP_LOCAL_PARTS = new Set([
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "info",
  "contact",
  "support",
  "help",
  "hello",
  "team",
  "abuse",
  "postmaster",
  "admin",
  "webmaster",
  "billing",
  "sales",
  "marketing",
  "press",
  "media",
  "careers",
  "jobs",
  "hr",
  "legal",
  "privacy",
])

export function isRoleEmail(email) {
  if (!email || !email.includes("@")) return true
  const local = email.split("@")[0].toLowerCase().trim()
  if (HARD_SKIP_LOCAL_PARTS.has(local)) return true
  const base = local.split("+")[0]
  return HARD_SKIP_LOCAL_PARTS.has(base)
}
