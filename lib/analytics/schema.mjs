// Deliberately narrow: analytics never receives CRM/prospect identifiers.
export const BROWSER_EVENTS = Object.freeze([
  "page_view", "landing_viewed", "primary_cta_clicked", "booking_opened",
  "booking_started", "booking_completed", "inquiry_submitted",
])
export const EVENT_NAMES = Object.freeze([
  ...BROWSER_EVENTS, "booking_attributed", "lead_created",
  "qualified_lead_created", "needs_context_lead_created", "not_icp_lead_created",
])
const PATHS = new Set([
  "/", "/animated", "/systems/qualified-pipeline", "/privacy-policy", "/legal", "/cookies",
])
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function dimension(value, fallback) {
  if (typeof value !== "string") return fallback
  const clean = value.trim().toLowerCase()
  // No URL, email, phone, query, control character or long arbitrary payload.
  if (!/^[a-z][a-z0-9._ -]{0,79}$/.test(clean) || /\d{7,}/.test(clean)) return fallback
  return clean
}

export function sanitizeDimensions(input = {}) {
  const candidate = input && typeof input === "object" ? input : {}
  const path = typeof candidate.path === "string" ? candidate.path.split(/[?#]/, 1)[0].replace(/\/$/, "") || "/" : "/"
  return {
    source: dimension(candidate.source, "direct"),
    campaign: dimension(candidate.campaign, "none"),
    medium: dimension(candidate.medium, "none"),
    path: PATHS.has(path) ? path : "/other",
  }
}

export function validEvent(input, browserOnly = false) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null
  const permitted = browserOnly ? BROWSER_EVENTS : EVENT_NAMES
  if (!permitted.includes(input.name) || !UUID.test(input.eventId || "")) return null
  if (input.visitorId != null && !UUID.test(input.visitorId)) return null
  if (browserOnly && !input.visitorId) return null
  return {
    name: input.name,
    eventId: input.eventId.toLowerCase(),
    visitorId: input.visitorId?.toLowerCase() || null,
    ...sanitizeDimensions(input.dimensions),
  }
}
