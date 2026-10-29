/** Shared, deliberately small analytics contract. CRM identifiers never belong here. */
export const BROWSER_EVENTS = [
  "page_view", "landing_viewed", "primary_cta_clicked", "booking_opened",
  "booking_started", "booking_completed", "inquiry_submitted",
] as const

export const SERVER_EVENTS = [
  "inquiry_submitted", "booking_attributed", "lead_created",
  "qualified_lead_created", "needs_context_lead_created", "not_icp_lead_created",
] as const

export type BrowserEventName = typeof BROWSER_EVENTS[number]
export type ServerEventName = typeof SERVER_EVENTS[number]
export type AnalyticsEventName = BrowserEventName | ServerEventName
export type AnalyticsEnvironment = "production" | "staging"
export type AnalyticsDimensions = { source: string; campaign: string; medium: string; path: string }
export type AnalyticsEvent = AnalyticsDimensions & {
  eventId: string
  visitorId: string | null
  name: AnalyticsEventName
}

const PATHS = new Set(["/", "/animated", "/systems/qualified-pipeline", "/privacy-policy", "/legal", "/cookies", "/other"])
const SOURCES = new Set([
  "direct", "website", "google", "bing", "duckduckgo", "facebook", "meta", "instagram",
  "linkedin", "email", "outbound", "referral", "partner", "community", "internal_qa", "other",
])
const MEDIA = new Set(["none", "organic", "organic_social", "paid_social", "cpc", "ppc", "email", "outbound", "referral", "social", "paid", "other"])
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function dimension(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback
  const clean = value.trim().toLowerCase()
  // Retain ordinary campaign labels, not addresses, URLs, phone numbers,
  // encoded queries, UUIDs, prospect references, or arbitrary long payloads.
  if (!/^[a-z][a-z0-9._ -]{0,79}$/.test(clean)
    || /(?:\d[ ._-]*){7}|[a-f0-9]{24,}|[0-9a-f]{8}-[0-9a-f]{4}-|\b(?:\d{1,3}\.){3}\d{1,3}\b|\b(?:ax[-_ ]?ref|prospect|contact)[-_ ]/i.test(clean)) return fallback
  return clean
}

function trafficSource(input: unknown) {
  const value = dimension(input, "direct").replace(/^www\./, "")
  if (SOURCES.has(value)) return value
  if (/^(?:[a-z]+\.)?google\.(?:com|[a-z]{2}|co\.[a-z]{2})$/.test(value)) return "google"
  if (["bing.com", "duckduckgo.com"].includes(value)) return value.split(".")[0]
  if (/^(?:l\.|m\.)?facebook\.com$/.test(value)) return "facebook"
  if (/^(?:l\.)?instagram\.com$/.test(value)) return "instagram"
  if (value === "linkedin.com") return "linkedin"
  return "other"
}

export function sanitizeDimensions(input: unknown = {}): AnalyticsDimensions {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {}
  const medium = dimension(value.medium, "none")
  // Store only known public paths, never a raw URL, query, hash or unknown slug.
  let path = typeof value.path === "string" ? value.path : "/"
  if (/^https?:\/\//i.test(path)) {
    try { path = new URL(path).pathname } catch { path = "/other" }
  }
  const candidate = path.split(/[?#]/, 1)[0].replace(/\/$/, "") || "/"
  return {
    source: trafficSource(value.source),
    campaign: dimension(value.campaign, "none"),
    medium: MEDIA.has(medium) ? medium : "other",
    path: PATHS.has(candidate) ? candidate : "/other",
  }
}

export function validEvent(input: unknown, browserOnly = false): AnalyticsEvent | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null
  const value = input as Record<string, unknown>
  if (Object.keys(value).some(key => !["eventId", "visitorId", "name", "dimensions"].includes(key))) return null
  const names: readonly string[] = browserOnly ? BROWSER_EVENTS : [...BROWSER_EVENTS, ...SERVER_EVENTS]
  if (typeof value.name !== "string" || !names.includes(value.name)) return null
  if (typeof value.eventId !== "string" || !UUID.test(value.eventId)) return null
  if (value.visitorId != null && (typeof value.visitorId !== "string" || !UUID.test(value.visitorId))) return null
  if (browserOnly && !value.visitorId) return null
  if (!value.dimensions || typeof value.dimensions !== "object" || Array.isArray(value.dimensions)) return null
  if (Object.keys(value.dimensions).some(key => !["source", "campaign", "medium", "path"].includes(key))) return null
  return {
    eventId: value.eventId.toLowerCase(), visitorId: typeof value.visitorId === "string" ? value.visitorId.toLowerCase() : null,
    name: value.name as AnalyticsEventName, ...sanitizeDimensions(value.dimensions),
  }
}
