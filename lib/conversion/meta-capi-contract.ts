import crypto from "node:crypto"
import type { StructuredBookingLead } from "./cal-webhook.ts"
import type { MetaAttributionMapping } from "./meta-attribution-allowlist.ts"

export type MetaLeadDeliveryPlan =
  | { action: "skip"; reason: "not_meta_attributed" | "booking_pending" | "already_sent" }
  | { action: "send"; eventId: string }

export class MetaLeadContractError extends Error {
  readonly code: "meta_event_id_conflict" | "invalid_event_time"

  constructor(code: MetaLeadContractError["code"]) {
    super(code)
    this.name = "MetaLeadContractError"
    this.code = code
  }
}

function digest(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function normalizedPhone(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits.length >= 7 && digits.length <= 15 ? digits : ""
}

export function metaLeadEventId(bookingUid: string) {
  return `cal:${bookingUid}`
}

export function isMetaAttributedLead(lead: StructuredBookingLead) {
  if (lead.metaAdId || lead.fbclid || lead.fbc) return true
  const source = lead.utmSource.toLowerCase()
  const medium = lead.utmMedium.toLowerCase().replace(/[\s-]+/g, "_")
  return ["meta", "facebook", "instagram"].includes(source)
    && ["paid_social", "cpc", "paid"].includes(medium)
}

export function planMetaLeadDelivery(input: {
  bookingUid: string
  bookingStatus: StructuredBookingLead["bookingStatus"]
  metaAttributed: boolean
  storedEventId: string
  storedSentAt: string
}): MetaLeadDeliveryPlan {
  if (!input.metaAttributed) return { action: "skip", reason: "not_meta_attributed" }
  if (input.bookingStatus !== "Booked") return { action: "skip", reason: "booking_pending" }

  const expected = metaLeadEventId(input.bookingUid)
  if (input.storedEventId && input.storedEventId !== expected) {
    throw new MetaLeadContractError("meta_event_id_conflict")
  }
  if (input.storedSentAt) return { action: "skip", reason: "already_sent" }
  return { action: "send", eventId: expected }
}

function eventSourceUrl(landingPage: string) {
  const path = landingPage.startsWith("/") && !landingPage.startsWith("//")
    ? landingPage
    : "/"
  const url = new URL(path, "https://aimedia.global")
  url.search = ""
  url.hash = ""
  return url.toString()
}

export type MetaLeadEvent = {
  event_name: "Lead"
  event_time: number
  event_id: string
  action_source: "website"
  event_source_url: string
  user_data: {
    em: string[]
    ph?: string[]
    fbc?: string
    fbp?: string
  }
  custom_data: {
    source: string
    qualification_status: StructuredBookingLead["qualificationStatus"]
    meta_campaign_id?: string
    meta_adset_id?: string
    meta_ad_id?: string
    creative_label?: string
  }
}

export function buildMetaLeadEvent(
  lead: StructuredBookingLead,
  attribution: MetaAttributionMapping,
): MetaLeadEvent {
  const eventTime = Math.floor(Date.parse(lead.bookedAt) / 1000)
  if (!Number.isFinite(eventTime) || eventTime <= 0) {
    throw new MetaLeadContractError("invalid_event_time")
  }

  const phone = normalizedPhone(lead.phone)
  return {
    event_name: "Lead",
    event_time: eventTime,
    event_id: metaLeadEventId(lead.bookingUid),
    action_source: "website",
    event_source_url: eventSourceUrl(lead.landingPage),
    user_data: {
      em: [digest(lead.email.trim().toLowerCase())],
      ...(phone ? { ph: [digest(phone)] } : {}),
      ...(lead.fbc ? { fbc: lead.fbc } : {}),
      ...(lead.fbp ? { fbp: lead.fbp } : {}),
    },
    custom_data: {
      source: lead.source,
      qualification_status: lead.qualificationStatus,
      meta_campaign_id: attribution.campaignId,
      meta_adset_id: attribution.adSetId,
      meta_ad_id: attribution.adId,
      creative_label: attribution.creativeLabel,
    },
  }
}
