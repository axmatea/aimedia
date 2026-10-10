export const BUSINESS_TYPES = [
  "B2B SaaS",
  "Software",
  "B2B Services",
  "Other",
] as const

export const BUYER_ROLES = [
  "Founder / CEO",
  "COO",
  "Head of Growth",
  "RevOps",
  "Other",
] as const

export const BUDGET_BANDS = [
  "Under $5k",
  "$5k–$10k",
  "$10k–$25k",
  "$25k+",
] as const

export const TIMELINES = [
  "0–30 days",
  "31–90 days",
  "90+ days",
  "Exploring",
] as const

export const CONTACT_PREFERENCES = [
  "Email",
  "Phone",
  "WhatsApp",
  "Other",
] as const

export type BusinessType = typeof BUSINESS_TYPES[number] | ""
export type BuyerRole = typeof BUYER_ROLES[number] | ""
export type BudgetBand = typeof BUDGET_BANDS[number] | ""
export type Timeline = typeof TIMELINES[number] | ""
export type ContactPreference = typeof CONTACT_PREFERENCES[number] | ""

export type QualificationStatus = "QUALIFIED" | "NEEDS_CONTEXT" | "NOT_ICP"

export type QualificationInput = {
  company: string
  website: string
  businessType: BusinessType
  buyerRole: BuyerRole
  problem: string
  serviceNeeded: string
  budgetBand: BudgetBand
  timeline: Timeline
  preferredContact: ContactPreference
}

export type QualificationResult = {
  status: QualificationStatus
  qualified: boolean
  reasons: string[]
}

function normalizedChoice(value: string) {
  return value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizeBusinessType(value: string): BusinessType {
  const choice = normalizedChoice(value)
  if (!choice) return ""
  if (["b2b saas", "saas", "software as a service"].includes(choice)) return "B2B SaaS"
  if (["software", "software company", "software business"].includes(choice)) return "Software"
  if ([
    "b2b services",
    "b2b service",
    "professional services",
    "agency",
    "consulting",
    "service business",
  ].includes(choice)) return "B2B Services"
  if (["other", "not listed", "none of the above"].includes(choice)) return "Other"
  return ""
}

export function normalizeBuyerRole(value: string): BuyerRole {
  const choice = normalizedChoice(value)
  if (!choice) return ""
  if ([
    "founder ceo",
    "founder",
    "co founder",
    "cofounder",
    "ceo",
    "owner",
    "business owner",
  ].includes(choice)) return "Founder / CEO"
  if (["coo", "chief operating officer", "operations lead", "head of operations"].includes(choice)) return "COO"
  if (["head of growth", "growth lead", "vp growth", "chief growth officer", "cgo"].includes(choice)) return "Head of Growth"
  if (["revops", "revenue operations", "head of revops", "revenue operations lead"].includes(choice)) return "RevOps"
  if (["other", "not a decision maker", "individual contributor"].includes(choice)) return "Other"
  return ""
}

export function normalizeBudgetBand(value: string): BudgetBand {
  if (/^\s*<\s*\$?\s*5k\s*$/i.test(value)) return "Under $5k"
  const choice = normalizedChoice(value).replace(/usd/g, "").trim()
  if (!choice) return ""
  if (/^(under|below|less than) 5k$/.test(choice) || choice === "0 5k") return "Under $5k"
  if (["5k 10k", "5 10k", "$5k $10k"].includes(choice)) return "$5k–$10k"
  if (["10k 25k", "10 25k", "$10k $25k"].includes(choice)) return "$10k–$25k"
  if (["25k+", "25k plus", "above 25k", "over 25k"].includes(choice)) return "$25k+"
  return ""
}

export function normalizeTimeline(value: string): Timeline {
  const choice = normalizedChoice(value)
  if (!choice) return ""
  if (["0 30", "0 30 days", "within 30 days", "this month", "immediately"].includes(choice)) return "0–30 days"
  if (["31 90", "31 90 days", "within 90 days", "1 3 months"].includes(choice)) return "31–90 days"
  if (["90+", "90+ days", "90 days", "more than 90 days", "3+ months"].includes(choice)) return "90+ days"
  if (["exploring", "just exploring", "researching", "no timeline"].includes(choice)) return "Exploring"
  return ""
}

export function normalizeContactPreference(value: string): ContactPreference {
  const choice = normalizedChoice(value)
  if (!choice) return ""
  if (["email", "e mail"].includes(choice)) return "Email"
  if (["phone", "phone call", "call"].includes(choice)) return "Phone"
  if (["whatsapp", "whats app"].includes(choice)) return "WhatsApp"
  if (["other", "sms", "text", "linkedin"].includes(choice)) return "Other"
  return ""
}

export function normalizeWebsite(value: string) {
  const candidate = value.trim().slice(0, 500)
  if (!candidate) return ""
  try {
    const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`)
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) return ""
    url.hash = ""
    return url.toString().slice(0, 500)
  } catch {
    return ""
  }
}

export function evaluateQualification(input: QualificationInput): QualificationResult {
  const missing: string[] = []
  if (!input.company) missing.push("missing_company")
  if (!input.website) missing.push("missing_or_invalid_website")
  if (!input.businessType) missing.push("missing_business_type")
  if (!input.buyerRole) missing.push("missing_buyer_role")
  if (!input.problem) missing.push("missing_problem")
  if (!input.serviceNeeded) missing.push("missing_service_needed")
  if (!input.budgetBand) missing.push("missing_budget_band")
  if (!input.timeline) missing.push("missing_timeline")
  if (!input.preferredContact) missing.push("missing_contact_preference")

  const mismatches: string[] = []
  if (input.businessType === "Other") mismatches.push("business_type_not_icp")
  if (input.buyerRole === "Other") mismatches.push("buyer_role_not_decision_maker")
  if (input.budgetBand === "Under $5k") mismatches.push("budget_below_5k")
  if (input.timeline === "90+ days" || input.timeline === "Exploring") {
    mismatches.push("timeline_beyond_90_days")
  }

  if (mismatches.length) {
    return { status: "NOT_ICP", qualified: false, reasons: [...mismatches, ...missing] }
  }
  if (missing.length) return { status: "NEEDS_CONTEXT", qualified: false, reasons: missing }
  return { status: "QUALIFIED", qualified: true, reasons: [] }
}
