import crypto from "node:crypto"

export const MAX_CAL_WEBHOOK_BYTES = 64 * 1024

type UnknownRecord = Record<string, unknown>

export type StructuredBookingLead = {
  bookingUid: string
  bookingStatus: "Booked" | "Pending"
  name: string
  email: string
  phone: string
  company: string
  projectContext: string
  source: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm: string
  utmContent: string
  attributionRef: string
  referrerHost: string
  landingPage: string
  conversionAction: "book_a_call"
  capturedAt: string
  bookedAt: string
  startTime: string
  endTime: string
  qualified: boolean
  contextStatus: "QUALIFIED" | "NEEDS CONTEXT"
}

export type CalWebhookParseResult =
  | { ok: true; lead: StructuredBookingLead }
  | { ok: false; error: "invalid_json" | "invalid_payload" | "unsupported_trigger" }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ATTRIBUTION_REF = /^[A-Za-z0-9_-]{6,96}$/
const SUPPORTED_TRIGGERS = new Set(["BOOKING_CREATED", "BOOKING_REQUESTED"])

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null
}

function clean(value: unknown, maxLength = 240) {
  if (typeof value !== "string" && typeof value !== "number") return ""
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
}

function iso(value: unknown) {
  const normalized = clean(value, 80)
  if (!normalized || !Number.isFinite(Date.parse(normalized))) return ""
  return new Date(normalized).toISOString()
}

function responseValue(value: unknown) {
  const item = record(value)
  if (!item) return clean(value, 1200)
  const candidate = item.value
  if (Array.isArray(candidate)) return clean(candidate.join(", "), 1200)
  return clean(candidate, 1200)
}

function normalizedKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function responseLookup(payload: UnknownRecord, aliases: string[]) {
  const wanted = new Set(aliases.map(normalizedKey))
  for (const source of [record(payload.responses), record(payload.userFieldsResponses)]) {
    if (!source) continue
    for (const [key, raw] of Object.entries(source)) {
      const item = record(raw)
      const label = clean(item?.label, 160)
      if (wanted.has(normalizedKey(key)) || (label && wanted.has(normalizedKey(label)))) {
        const value = responseValue(raw)
        if (value) return value
      }
    }
  }
  return ""
}

function metadataValue(metadata: UnknownRecord | null, ...keys: string[]) {
  for (const key of keys) {
    const value = clean(metadata?.[key], 240)
    if (value) return value
  }
  return ""
}

export function verifyCalWebhookSignature(input: {
  rawBody: string
  signature: string | null
  secret: string
}) {
  if (input.secret.trim().length < 32 || !input.signature) return false
  const supplied = input.signature.trim().replace(/^sha256=/i, "").toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false
  const expected = crypto.createHmac("sha256", input.secret).update(input.rawBody).digest("hex")
  return crypto.timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"))
}

export function isCalWebhookPing(rawBody: string) {
  try {
    const envelope = record(JSON.parse(rawBody))
    return clean(envelope?.triggerEvent, 80) === "PING"
  } catch {
    return false
  }
}

export function parseCalBookingLead(rawBody: string): CalWebhookParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return { ok: false, error: "invalid_json" }
  }

  const envelope = record(parsed)
  const trigger = clean(envelope?.triggerEvent, 80)
  if (!SUPPORTED_TRIGGERS.has(trigger)) return { ok: false, error: "unsupported_trigger" }

  const payload = record(envelope?.payload)
  if (!payload) return { ok: false, error: "invalid_payload" }
  const attendees = Array.isArray(payload.attendees) ? payload.attendees : []
  const attendee = attendees.map(record).find((item) => EMAIL_PATTERN.test(clean(item?.email, 254).toLowerCase()))
  const metadata = record(payload.metadata)

  const bookingUid = clean(payload.uid, 200)
  const email = clean(attendee?.email, 254).toLowerCase()
  const name = clean(attendee?.name, 200) || responseLookup(payload, ["name", "your name"])
  const phone = responseLookup(payload, ["phone", "phone number", "attendee phone number"])
  const company = responseLookup(payload, ["company", "company name", "business", "organization"])
  const projectContext = responseLookup(payload, [
    "project context",
    "what should we solve",
    "what do you need",
    "goal",
    "project",
    "notes",
    "additional notes",
  ])
  const bookedAt = iso(envelope?.createdAt)
  const startTime = iso(payload.startTime)
  const endTime = iso(payload.endTime)

  if (!bookingUid || !EMAIL_PATTERN.test(email) || !name || !bookedAt || !startTime || !endTime) {
    return { ok: false, error: "invalid_payload" }
  }

  const utmSource = metadataValue(metadata, "utmSource", "utm_source")
  const utmMedium = metadataValue(metadata, "utmMedium", "utm_medium")
  const utmCampaign = metadataValue(metadata, "utmCampaign", "utm_campaign")
  const utmTerm = metadataValue(metadata, "utmTerm", "utm_term")
  const utmContent = metadataValue(metadata, "utmContent", "utm_content")
  const rawAttributionRef = metadataValue(metadata, "attributionRef")
  const landingPath = metadataValue(metadata, "landingPath") || "/"
  const pending = trigger === "BOOKING_REQUESTED"
    || payload.requiresConfirmation === true
    || clean(payload.status, 40).toUpperCase() === "PENDING"
  const qualified = Boolean(company && projectContext)

  return {
    ok: true,
    lead: {
      bookingUid,
      bookingStatus: pending ? "Pending" : "Booked",
      name,
      email,
      phone,
      company,
      projectContext,
      source: metadataValue(metadata, "source") || utmSource || "Website",
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      attributionRef: ATTRIBUTION_REF.test(rawAttributionRef) ? rawAttributionRef : "",
      referrerHost: metadataValue(metadata, "referrerHost"),
      landingPage: landingPath.startsWith("/") ? landingPath : "/",
      conversionAction: "book_a_call",
      capturedAt: iso(metadataValue(metadata, "capturedAt")) || bookedAt,
      bookedAt,
      startTime,
      endTime,
      qualified,
      contextStatus: qualified ? "QUALIFIED" : "NEEDS CONTEXT",
    },
  }
}
