import assert from "node:assert/strict"
import test from "node:test"

import {
  bookingReplayWriteMode,
  mergeBookingReplay,
  type PersistedBookingSnapshot,
} from "../../../lib/conversion/booking-replay.ts"
import type { StructuredBookingLead } from "../../../lib/conversion/cal-webhook.ts"
import { planMetaLeadDelivery } from "../../../lib/conversion/meta-capi-contract.ts"
import { verifyMetaAttribution } from "../../../lib/conversion/meta-attribution-allowlist.ts"

function lead(overrides: Partial<StructuredBookingLead> = {}): StructuredBookingLead {
  return {
    bookingUid: "booking_uid_123",
    bookingStatus: "Booked",
    eventTypeId: "5203336",
    eventTypeSlug: "call",
    organizerUsername: "axmedia",
    name: "Verification Owner",
    email: "owner@example.invalid",
    phone: "",
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
    utmCampaign: "new-campaign",
    utmTerm: "new-term",
    utmContent: "NEW_CREATIVE",
    fbclid: "new_fbclid_123456",
    fbc: "fb.1.1755712800000.new_fbclid_123456",
    fbp: "fb.1.1700000000000.987654321",
    attributionRef: "120249999999990103",
    metaCampaignId: "120249999999990101",
    metaAdSetId: "120249999999990102",
    metaAdId: "120249999999990103",
    creativeLabel: "NEW_CREATIVE",
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

function persisted(overrides: Partial<PersistedBookingSnapshot> = {}): PersistedBookingSnapshot {
  return {
    bookingStatus: "Booked",
    bookedAt: "2026-08-20T18:25:00.000Z",
    capturedAt: "2026-08-20T17:50:00.000Z",
    utmSource: "instagram",
    utmMedium: "paid_social",
    utmCampaign: "first-campaign",
    utmTerm: "first-term",
    utmContent: "A_HANDOFFS_STATIC",
    attributionRef: "120249999999990203",
    metaCampaignId: "120249999999990201",
    metaAdSetId: "120249999999990202",
    metaAdId: "120249999999990203",
    creativeLabel: "A_HANDOFFS_STATIC",
    fbclid: "first_fbclid_123456",
    fbc: "fb.1.1755712700000.first_fbclid_123456",
    fbp: "fb.1.1700000000000.123456789",
    referrerHost: "l.instagram.com",
    landingPage: "/systems/qualified-pipeline",
    ...overrides,
  }
}

test("an older pending retry cannot regress Booked or erase committed first touch", () => {
  const result = mergeBookingReplay(lead({
    bookingStatus: "Pending",
    bookedAt: "2026-08-20T18:00:00.000Z",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmTerm: "",
    utmContent: "",
    attributionRef: "",
    metaCampaignId: "",
    metaAdSetId: "",
    metaAdId: "",
    creativeLabel: "",
    fbclid: "",
    fbc: "",
    fbp: "",
    referrerHost: "",
    landingPage: "/",
  }), persisted(), false)

  assert.equal(result.bookingStatus, "Booked")
  assert.equal(result.bookedAt, "2026-08-20T18:25:00.000Z")
  assert.equal(result.capturedAt, "2026-08-20T17:50:00.000Z")
  assert.equal(result.utmCampaign, "first-campaign")
  assert.equal(result.metaAdId, "120249999999990203")
  assert.equal(result.creativeLabel, "A_HANDOFFS_STATIC")
  assert.equal(result.fbc, "fb.1.1755712700000.first_fbclid_123456")
  assert.equal(result.landingPage, "/systems/qualified-pipeline")
})

test("every committed Pending replay is read-only, even during a Booked race", () => {
  assert.equal(bookingReplayWriteMode({
    incomingStatus: "Pending",
    persistedStatus: "Pending",
    reservationCommitted: true,
  }), "READ_ONLY")
  assert.equal(bookingReplayWriteMode({
    incomingStatus: "Pending",
    persistedStatus: "Booked",
    reservationCommitted: false,
  }), "READ_ONLY")
  assert.equal(bookingReplayWriteMode({
    incomingStatus: "Booked",
    persistedStatus: "Pending",
    reservationCommitted: true,
  }), "IMMUTABLE_ATTRIBUTION")
})

test("a Booked promotion keeps first touch while advancing status and booking time", () => {
  const result = mergeBookingReplay(lead(), persisted({
    bookingStatus: "Pending",
    bookedAt: "2026-08-20T18:05:00.000Z",
  }), true)

  assert.equal(result.bookingStatus, "Booked")
  assert.equal(result.bookedAt, "2026-08-20T18:30:00.000Z")
  assert.equal(result.utmCampaign, "first-campaign")
  assert.equal(result.metaAdId, "120249999999990203")
})

test("blank trusted Meta fields are filled only by an exactly verified delivery", () => {
  const emptyMeta = persisted({
    metaCampaignId: "",
    metaAdSetId: "",
    metaAdId: "",
    creativeLabel: "",
  })
  const unverified = mergeBookingReplay(lead(), emptyMeta, false)
  assert.equal(unverified.metaAdId, "")
  assert.equal(unverified.creativeLabel, "")

  const verified = mergeBookingReplay(lead(), emptyMeta, true)
  assert.equal(verified.metaAdId, "120249999999990103")
  assert.equal(verified.creativeLabel, "NEW_CREATIVE")
})

test("a verified tuple cannot inherit click identifiers from an unverified epoch", () => {
  const spoofedPending = persisted({
    metaCampaignId: "",
    metaAdSetId: "",
    metaAdId: "",
    creativeLabel: "",
    fbclid: "spoofed_click_123456",
    fbc: "fb.1.1755712700000.spoofed_click_123456",
    fbp: "fb.1.1700000000000.111111111",
  })
  const verified = mergeBookingReplay(lead(), spoofedPending, true)

  assert.equal(verified.metaAdId, "120249999999990103")
  assert.equal(verified.fbclid, "new_fbclid_123456")
  assert.equal(verified.fbc, "fb.1.1755712800000.new_fbclid_123456")
  assert.equal(verified.fbp, "fb.1.1700000000000.987654321")
  assert.equal(JSON.stringify(verified).includes("spoofed_click_123456"), false)
})

test("committed replay attribution is immutable across concurrent Pending and Booked deliveries", () => {
  const unverifiedSnapshot = persisted({
    bookingStatus: "Pending",
    metaCampaignId: "",
    metaAdSetId: "",
    metaAdId: "",
    creativeLabel: "",
    fbclid: "spoofed_click_123456",
    fbc: "fb.1.1755712700000.spoofed_click_123456",
    fbp: "fb.1.1700000000000.111111111",
  })
  const pending = mergeBookingReplay(lead({ bookingStatus: "Pending" }), unverifiedSnapshot, true, true)
  const booked = mergeBookingReplay(lead({ bookingStatus: "Booked" }), unverifiedSnapshot, true, true)

  assert.equal(pending.metaAdId, "")
  assert.equal(booked.metaAdId, "")
  assert.equal(pending.fbclid, "spoofed_click_123456")
  assert.equal(booked.fbclid, "spoofed_click_123456")
  assert.equal(verifyMetaAttribution(pending, JSON.stringify([{
    campaignId: "120249999999990101",
    adSetId: "120249999999990102",
    adId: "120249999999990103",
    creativeLabel: "NEW_CREATIVE",
  }])).status, "UNVERIFIED")
  assert.equal(verifyMetaAttribution(booked, JSON.stringify([{
    campaignId: "120249999999990101",
    adSetId: "120249999999990102",
    adId: "120249999999990103",
    creativeLabel: "NEW_CREATIVE",
  }])).status, "UNVERIFIED")
})

test("a stale-acquired Pending retry cannot send CAPI from attribution absent in its Booked CRM row", () => {
  const bookedWithoutMeta = persisted({
    bookingStatus: "Booked",
    metaCampaignId: "",
    metaAdSetId: "",
    metaAdId: "",
    creativeLabel: "",
    fbclid: "",
    fbc: "",
    fbp: "",
  })
  const writeMode = bookingReplayWriteMode({
    incomingStatus: "Pending",
    persistedStatus: bookedWithoutMeta.bookingStatus,
    reservationCommitted: false,
  })
  assert.equal(writeMode, "READ_ONLY")

  // READ_ONLY is immutable even when the stale D1 reservation was newly
  // acquired: the allowlisted incoming tuple is not part of canonical CRM.
  const effective = mergeBookingReplay(
    lead({ bookingStatus: "Pending" }),
    bookedWithoutMeta,
    true,
    writeMode === "READ_ONLY",
  )
  const verification = verifyMetaAttribution(effective, JSON.stringify([{
    campaignId: "120249999999990101",
    adSetId: "120249999999990102",
    adId: "120249999999990103",
    creativeLabel: "NEW_CREATIVE",
  }]))
  const delivery = planMetaLeadDelivery({
    bookingUid: effective.bookingUid,
    bookingStatus: effective.bookingStatus,
    metaAttributed: verification.verified,
    storedEventId: "",
    storedSentAt: "",
  })

  assert.equal(effective.bookingStatus, "Booked")
  assert.equal(effective.metaAdId, "")
  assert.equal(effective.fbclid, "")
  assert.equal(verification.status, "UNVERIFIED")
  assert.deepEqual(delivery, { action: "skip", reason: "not_meta_attributed" })
})

test("a trusted tuple fills missing identifiers only from the same verified tuple", () => {
  const trustedWithoutBrowserIds = persisted({ fbclid: "", fbc: "", fbp: "" })
  const differentTuple = mergeBookingReplay(lead(), trustedWithoutBrowserIds, true)
  assert.equal(differentTuple.metaAdId, "120249999999990203")
  assert.equal(differentTuple.fbclid, "")
  assert.equal(differentTuple.fbc, "")
  assert.equal(differentTuple.fbp, "")

  const sameTupleLead = lead({
    metaCampaignId: "120249999999990201",
    metaAdSetId: "120249999999990202",
    metaAdId: "120249999999990203",
    creativeLabel: "A_HANDOFFS_STATIC",
  })
  const sameTuple = mergeBookingReplay(sameTupleLead, trustedWithoutBrowserIds, true)
  assert.equal(sameTuple.fbclid, "new_fbclid_123456")
  assert.equal(sameTuple.fbc, "fb.1.1755712800000.new_fbclid_123456")
  assert.equal(sameTuple.fbp, "fb.1.1700000000000.987654321")
})

test("preserved trusted Meta first touch can be reverified for a later Booked delivery", () => {
  const result = mergeBookingReplay(lead({
    metaCampaignId: "",
    metaAdSetId: "",
    metaAdId: "",
    creativeLabel: "",
    fbclid: "",
    fbc: "",
  }), persisted(), false)
  const verification = verifyMetaAttribution(result, JSON.stringify([{
    campaignId: "120249999999990201",
    adSetId: "120249999999990202",
    adId: "120249999999990203",
    creativeLabel: "A_HANDOFFS_STATIC",
  }]))
  assert.equal(verification.status, "VERIFIED")
})
