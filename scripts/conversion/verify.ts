#!/usr/bin/env node

import assert from "node:assert/strict"

import {
  attributionFromLocation,
  calAttributionConfig,
} from "../../lib/conversion/attribution.ts"
import { parseCalBookingLead } from "../../lib/conversion/cal-webhook.ts"
import {
  planBookingWrite,
  verifyBookingMapping,
} from "../../lib/conversion/booking-contract.ts"

const bookingUid = "local_verification_booking_uid"
const email = "verification@example.invalid"
const recordId = "local_canonical_record"
const capturedAt = "2026-08-22T12:00:00.000Z"
const attribution = attributionFromLocation(
  "https://aimedia.global/systems/qualified-pipeline?utm_source=facebook&utm_medium=paid_social&utm_campaign=local_readiness&utm_content=A_HANDOFFS_STATIC&ax_ref=120249999999990103&meta_campaign_id=120249999999990101&meta_adset_id=120249999999990102&meta_ad_id=120249999999990103&fbclid=local_meta_click_123456789",
  "https://www.facebook.com/",
  capturedAt,
  "_fbp=fb.1.1700000000000.987654321",
)
const calConfig = calAttributionConfig(attribution)
const metadata = Object.fromEntries(
  Object.entries(calConfig)
    .filter(([key]) => key.startsWith("metadata["))
    .map(([key, value]) => [key.slice(9, -1), value]),
)

const webhook = JSON.stringify({
  triggerEvent: "BOOKING_CREATED",
  createdAt: "2026-08-22T12:30:00.000Z",
  payload: {
    uid: bookingUid,
    eventType: { id: 8675309, slug: "call" },
    organizer: { username: "axmedia" },
    status: "ACCEPTED",
    startTime: "2026-08-25T17:00:00.000Z",
    endTime: "2026-08-25T17:30:00.000Z",
    attendees: [{ name: "Local Verification", email }],
    responses: {
      company: { label: "Company", value: "Local Verification" },
      website: { label: "Company website", value: "https://example.invalid" },
      businessType: { label: "Business type", value: "B2B SaaS" },
      role: { label: "Your role", value: "Founder / CEO" },
      notes: { label: "What should we solve?", value: "Verify attribution" },
      service: { label: "Service needed", value: "Revenue workflow automation" },
      budget: { label: "Budget band", value: "$5k–$10k" },
      timeline: { label: "Timeline", value: "31–90 days" },
      contact: { label: "Preferred contact channel", value: "Email" },
    },
    metadata,
  },
})

const parsed = parseCalBookingLead(webhook)
assert.equal(parsed.ok, true)
if (!parsed.ok) process.exit(1)
assert.equal(parsed.lead.fbclid, attribution.fbclid)
assert.equal(parsed.lead.fbc, attribution.fbc)
assert.equal(parsed.lead.fbp, attribution.fbp)
assert.equal(parsed.lead.utmCampaign, attribution.utmCampaign)
assert.equal(parsed.lead.metaAdId, attribution.metaAdId)
assert.equal(parsed.lead.qualificationStatus, "QUALIFIED")

const create = planBookingWrite({
  bookingUid,
  email,
  uidMatches: [],
  emailMatches: [],
})
assert.equal(create.action, "create")

const canonical = { id: recordId, bookingUid, email }
const replay = planBookingWrite({
  bookingUid,
  email,
  uidMatches: [canonical],
  emailMatches: [],
})
assert.equal(replay.action, "update")
assert.equal(replay.reason, "booking_uid_replay")
verifyBookingMapping([canonical], recordId)

console.log(JSON.stringify({
  ok: true,
  fixtureOnly: true,
  productionCalled: false,
  checks: {
    firstTouchMetaCapture: true,
    calMetadataRoundTrip: true,
    bookingUidCreatePlan: true,
    bookingUidReplayDeduplicated: true,
    exactlyOneCanonicalMapping: true,
    qualificationContract: true,
    creativeAttributionRoundTrip: true,
  },
}, null, 2))
