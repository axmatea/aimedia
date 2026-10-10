import crypto from "node:crypto"
import {
  evaluateQualification,
  normalizeBudgetBand,
  normalizeBusinessType,
  normalizeBuyerRole,
  normalizeContactPreference,
  normalizeTimeline,
  normalizeWebsite,
  type BudgetBand,
  type BusinessType,
  type BuyerRole,
  type ContactPreference,
  type QualificationStatus,
  type Timeline,
} from "./qualification.ts"

export const MAX_CAL_WEBHOOK_BYTES = 64 * 1024

type UnknownRecord = Record<string, unknown>

export type StructuredBookingLead = {
  bookingUid: string
  bookingStatus: "Booked" | "Pending"
  eventTypeId: string
  eventTypeSlug: string
  organizerUsername: string
  name: string
  email: string
  phone: string
  company: string
  website: string
  businessType: BusinessType
  buyerRole: BuyerRole
  problem: string
  serviceNeeded: string
  budgetBand: BudgetBand
  timeline: Timeline
  preferredContact: ContactPreference
  projectContext: string
  source: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm: string
  utmContent: string
  fbclid: string
  fbc: string
  fbp: string
  attributionRef: string
  metaCampaignId: string
  metaAdSetId: string
  metaAdId: string
  creativeLabel: string
  referrerHost: string
  landingPage: string
  conversionAction: "book_a_call"
  capturedAt: string
  bookedAt: string
  startTime: string
  endTime: string
  qualified: boolean
  qualificationStatus: QualificationStatus
  qualificationReasons: string[]
  contextStatus: QualificationStatus
}

export type CalWebhookParseResult =
  | { ok: true; lead: StructuredBookingLead }
  | { ok: false; error: "invalid_json" | "invalid_payload" | "unsupported_trigger" }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ATTRIBUTION_REF = /^[A-Za-z0-9_-]{6,96}$/
const META_CLICK_ID = /^[A-Za-z0-9._~-]{8,512}$/
const META_BROWSER_ID = /^fb\.\d\.\d{10,16}\.[A-Za-z0-9._~-]{6,512}$/
const META_OBJECT_ID = /^\d{6,32}$/
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

function allowlistedMetadata(
  metadata: UnknownRecord | null,
  pattern: RegExp,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = clean(metadata?.[key], 560)
    if (pattern.test(value)) return value
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
  const eventType = record(payload.eventType) || record(payload.type)
  const organizer = record(payload.organizer)

  const bookingUid = clean(payload.uid, 200)
  const eventTypeId = clean(payload.eventTypeId ?? eventType?.id, 20)
  const eventTypeSlug = clean(payload.eventTypeSlug ?? eventType?.slug, 120).toLowerCase()
  const organizerUsername = clean(
    organizer?.username ?? payload.organizerUsername,
    120,
  ).toLowerCase()
  const email = clean(attendee?.email, 254).toLowerCase()
  const name = clean(attendee?.name, 200) || responseLookup(payload, ["name", "your name"])
  const phone = responseLookup(payload, ["phone", "phone number", "attendee phone number"])
  const company = responseLookup(payload, ["company", "company name", "business", "organization"])
  const website = normalizeWebsite(responseLookup(payload, [
    "website",
    "company website",
    "business website",
    "url",
  ]))
  const businessType = normalizeBusinessType(responseLookup(payload, [
    "business type",
    "type of business",
    "company type",
  ]))
  const buyerRole = normalizeBuyerRole(responseLookup(payload, [
    "your role",
    "role",
    "buyer role",
    "job title",
  ]))
  const problem = responseLookup(payload, [
    "concrete bottleneck",
    "current bottleneck",
    "bottleneck",
    "what should we solve",
    "biggest problem",
    "problem",
    "project context",
  ])
  const serviceNeeded = responseLookup(payload, [
    "service needed",
    "what service do you need",
    "what do you need",
    "service",
  ])
  const budgetBand = normalizeBudgetBand(responseLookup(payload, [
    "budget band",
    "budget",
    "investment range",
    "ability to invest",
  ]))
  const timeline = normalizeTimeline(responseLookup(payload, [
    "timeline",
    "urgency",
    "when do you want to start",
    "start timeline",
  ]))
  const preferredContact = normalizeContactPreference(responseLookup(payload, [
    "preferred contact",
    "preferred contact channel",
    "how should we contact you",
    "contact preference",
  ]))
  const projectContext = problem || responseLookup(payload, [
    "project context",
    "what do you need",
    "goal",
    "project",
    "notes",
    "additional notes",
  ])
  const bookedAt = iso(envelope?.createdAt)
  const startTime = iso(payload.startTime)
  const endTime = iso(payload.endTime)

  if (
    !bookingUid
    || !/^\d{1,20}$/.test(eventTypeId)
    || !eventTypeSlug
    || !/^[a-z0-9][a-z0-9._-]{1,119}$/.test(organizerUsername)
    || !EMAIL_PATTERN.test(email)
    || !name
    || !bookedAt
    || !startTime
    || !endTime
  ) {
    return { ok: false, error: "invalid_payload" }
  }

  const utmSource = metadataValue(metadata, "utmSource", "utm_source")
  const utmMedium = metadataValue(metadata, "utmMedium", "utm_medium")
  const utmCampaign = metadataValue(metadata, "utmCampaign", "utm_campaign")
  const utmTerm = metadataValue(metadata, "utmTerm", "utm_term")
  const utmContent = metadataValue(metadata, "utmContent", "utm_content")
  const fbclid = allowlistedMetadata(metadata, META_CLICK_ID, "fbclid")
  const fbc = allowlistedMetadata(metadata, META_BROWSER_ID, "fbc", "_fbc")
  const fbp = allowlistedMetadata(metadata, META_BROWSER_ID, "fbp", "_fbp")
  const rawAttributionRef = metadataValue(metadata, "attributionRef")
  const metaCampaignId = allowlistedMetadata(metadata, META_OBJECT_ID, "metaCampaignId")
  const metaAdSetId = allowlistedMetadata(metadata, META_OBJECT_ID, "metaAdSetId")
  const metaAdId = allowlistedMetadata(metadata, META_OBJECT_ID, "metaAdId")
    || (META_OBJECT_ID.test(rawAttributionRef) ? rawAttributionRef : "")
  const creativeLabel = metadataValue(metadata, "creativeLabel") || utmContent
  const landingPath = metadataValue(metadata, "landingPath") || "/"
  const pending = trigger === "BOOKING_REQUESTED"
    || payload.requiresConfirmation === true
    || clean(payload.status, 40).toUpperCase() === "PENDING"
  const qualification = evaluateQualification({
    company,
    website,
    businessType,
    buyerRole,
    problem,
    serviceNeeded,
    budgetBand,
    timeline,
    preferredContact,
  })

  // Reject mismatched click attribution instead of silently binding a booking
  // to a different Meta click carried by a stale or malformed fbc value.
  if (fbclid && fbc && !fbc.endsWith(`.${fbclid}`)) {
    return { ok: false, error: "invalid_payload" }
  }

  return {
    ok: true,
    lead: {
      bookingUid,
      bookingStatus: pending ? "Pending" : "Booked",
      eventTypeId,
      eventTypeSlug,
      organizerUsername,
      name,
      email,
      phone,
      company,
      website,
      businessType,
      buyerRole,
      problem,
      serviceNeeded,
      budgetBand,
      timeline,
      preferredContact,
      projectContext,
      source: metadataValue(metadata, "source") || utmSource || "Website",
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      fbclid,
      fbc,
      fbp,
      attributionRef: ATTRIBUTION_REF.test(rawAttributionRef) ? rawAttributionRef : "",
      metaCampaignId,
      metaAdSetId,
      metaAdId,
      creativeLabel,
      referrerHost: metadataValue(metadata, "referrerHost"),
      landingPage: landingPath.startsWith("/") ? landingPath : "/",
      conversionAction: "book_a_call",
      capturedAt: iso(metadataValue(metadata, "capturedAt")) || bookedAt,
      bookedAt,
      startTime,
      endTime,
      qualified: qualification.qualified,
      qualificationStatus: qualification.status,
      qualificationReasons: qualification.reasons,
      contextStatus: qualification.status,
    },
  }
}
