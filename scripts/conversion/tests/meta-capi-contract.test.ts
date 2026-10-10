import assert from "node:assert/strict"
import crypto from "node:crypto"
import test from "node:test"

import type { StructuredBookingLead } from "../../../lib/conversion/cal-webhook.ts"
import {
  buildMetaLeadEvent,
  isMetaAttributedLead,
  MetaLeadContractError,
  planMetaLeadDelivery,
} from "../../../lib/conversion/meta-capi-contract.ts"

function lead(overrides: Partial<StructuredBookingLead> = {}): StructuredBookingLead {
  return {
    bookingUid: "booking_uid_123",
    bookingStatus: "Booked",
    eventTypeId: "8675309",
    eventTypeSlug: "call",
    organizerUsername: "axmedia",
    name: "Verification Owner",
    email: "owner@example.invalid",
    phone: "+1 (415) 555-0123",
    company: "Verification Company",
    website: "https://example.invalid/",
    businessType: "B2B SaaS",
    buyerRole: "Founder / CEO",
    problem: "Manual handoffs",
    serviceNeeded: "Revenue workflow automation",
    budgetBand: "$5k–$10k",
    timeline: "31–90 days",
    preferredContact: "Email",
    projectContext: "Manual handoffs",
    source: "meta",
    utmSource: "facebook",
    utmMedium: "paid_social",
    utmCampaign: "proof",
    utmTerm: "broad",
    utmContent: "A_HANDOFFS_STATIC",
    fbclid: "IwAR3_meta_click_ABC123456789",
    fbc: "fb.1.1755712800000.IwAR3_meta_click_ABC123456789",
    fbp: "fb.1.1700000000000.987654321",
    attributionRef: "120249999999990103",
    metaCampaignId: "120249999999990101",
    metaAdSetId: "120249999999990102",
    metaAdId: "120249999999990103",
    creativeLabel: "A_HANDOFFS_STATIC",
    referrerHost: "www.facebook.com",
    landingPage: "/systems/qualified-pipeline",
    conversionAction: "book_a_call",
    capturedAt: "2026-08-20T18:00:00.000Z",
    bookedAt: "2026-08-20T18:30:00.000Z",
    startTime: "2026-08-24T17:00:00.000Z",
    endTime: "2026-08-24T17:30:00.000Z",
    qualified: true,
    qualificationStatus: "QUALIFIED",
    qualificationReasons: [],
    contextStatus: "QUALIFIED",
    ...overrides,
  }
}

test("sends a first accepted Meta booking once and skips pending/non-Meta bookings", () => {
  assert.deepEqual(planMetaLeadDelivery({
    bookingUid: "booking_uid_123",
    bookingStatus: "Booked",
    metaAttributed: true,
    storedEventId: "",
    storedSentAt: "",
  }), { action: "send", eventId: "cal:booking_uid_123" })

  assert.deepEqual(planMetaLeadDelivery({
    bookingUid: "booking_uid_123",
    bookingStatus: "Pending",
    metaAttributed: true,
    storedEventId: "",
    storedSentAt: "",
  }), { action: "skip", reason: "booking_pending" })

  assert.deepEqual(planMetaLeadDelivery({
    bookingUid: "booking_uid_123",
    bookingStatus: "Booked",
    metaAttributed: false,
    storedEventId: "",
    storedSentAt: "",
  }), { action: "skip", reason: "not_meta_attributed" })
})

test("a sent event is a replay and conflicting stored event IDs fail closed", () => {
  assert.deepEqual(planMetaLeadDelivery({
    bookingUid: "booking_uid_123",
    bookingStatus: "Booked",
    metaAttributed: true,
    storedEventId: "cal:booking_uid_123",
    storedSentAt: "2026-08-20T18:31:00.000Z",
  }), { action: "skip", reason: "already_sent" })

  assert.throws(() => planMetaLeadDelivery({
    bookingUid: "booking_uid_123",
    bookingStatus: "Booked",
    metaAttributed: true,
    storedEventId: "cal:a_different_booking",
    storedSentAt: "",
  }), (error) => error instanceof MetaLeadContractError && error.code === "meta_event_id_conflict")
})

test("builds a deterministic privacy-safe Meta Lead event", () => {
  const input = lead()
  assert.equal(isMetaAttributedLead(input), true)
  const event = buildMetaLeadEvent(input, {
    campaignId: input.metaCampaignId,
    adSetId: input.metaAdSetId,
    adId: input.metaAdId,
    creativeLabel: input.creativeLabel,
  })
  const serialized = JSON.stringify(event)

  assert.equal(event.event_name, "Lead")
  assert.equal(event.event_id, "cal:booking_uid_123")
  assert.equal(event.event_source_url, "https://aimedia.global/systems/qualified-pipeline")
  assert.equal(event.user_data.em[0], crypto.createHash("sha256").update(input.email).digest("hex"))
  assert.equal(event.user_data.ph?.[0], crypto.createHash("sha256").update("14155550123").digest("hex"))
  assert.equal(event.custom_data.meta_ad_id, input.metaAdId)
  assert.equal(event.custom_data.creative_label, input.creativeLabel)
  assert.equal(serialized.includes(input.email), false)
  assert.equal(serialized.includes(input.phone), false)
})

test("does not classify an ordinary non-paid booking as Meta attributed", () => {
  assert.equal(isMetaAttributedLead(lead({
    source: "direct",
    utmSource: "",
    utmMedium: "",
    fbclid: "",
    fbc: "",
    fbp: "fb.1.1700000000000.987654321",
    metaAdId: "",
  })), false)
})
