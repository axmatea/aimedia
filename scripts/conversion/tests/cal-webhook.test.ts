import assert from "node:assert/strict"
import crypto from "node:crypto"
import test from "node:test"

import {
  isCalWebhookPing,
  parseCalBookingLead,
  verifyCalWebhookSignature,
} from "../../../lib/conversion/cal-webhook.ts"

const SECRET = "local-cal-test-secret-with-at-least-32-characters"

function fixture({
  company = "AX Example",
  context = "Connect intake and delivery",
  website = "https://example.invalid",
  businessType = "B2B SaaS",
  role = "Founder / CEO",
  service = "Revenue workflow automation",
  budget = "$5k–$10k",
  timeline = "31–90 days",
  contact = "Email",
} = {}) {
  return JSON.stringify({
    triggerEvent: "BOOKING_CREATED",
    createdAt: "2026-08-20T18:30:00.000Z",
    payload: {
      uid: "booking_uid_123",
      eventType: { id: 8675309, slug: "call" },
      organizer: { username: "axmedia" },
      status: "ACCEPTED",
      startTime: "2026-08-24T17:00:00.000Z",
      endTime: "2026-08-24T17:30:00.000Z",
      attendees: [{ name: "Founder Name", email: "Founder@Example.com" }],
      responses: {
        attendeePhoneNumber: { label: "Phone number", value: "+14155550123" },
        company: { label: "Company", value: company },
        website: { label: "Company website", value: website },
        businessType: { label: "Business type", value: businessType },
        role: { label: "Your role", value: role },
        notes: { label: "What should we solve?", value: context },
        service: { label: "Service needed", value: service },
        budget: { label: "Budget band", value: budget },
        timeline: { label: "Timeline", value: timeline },
        contact: { label: "Preferred contact channel", value: contact },
      },
      metadata: {
        source: "outbound",
        utmSource: "email",
        utmMedium: "outbound",
        utmCampaign: "tier_a",
        landingPath: "/systems/qualified-pipeline",
        conversionAction: "book_a_call",
        attributionRef: "opaque_ref_123",
        capturedAt: "2026-08-20T18:00:00.000Z",
        fbclid: "IwAR3_meta_click_ABC123456789",
        fbc: "fb.1.1755712800000.IwAR3_meta_click_ABC123456789",
        fbp: "fb.1.1700000000000.987654321",
        metaCampaignId: "120249999999990101",
        metaAdSetId: "120249999999990102",
        metaAdId: "120249999999990103",
        creativeLabel: "A_HANDOFFS_STATIC",
      },
    },
  })
}

test("verifies the exact Cal webhook body with HMAC SHA-256", () => {
  const rawBody = fixture()
  const signature = crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex")
  assert.equal(verifyCalWebhookSignature({ rawBody, signature, secret: SECRET }), true)
  assert.equal(verifyCalWebhookSignature({ rawBody: `${rawBody} `, signature, secret: SECRET }), false)
  assert.equal(verifyCalWebhookSignature({ rawBody, signature: "invalid", secret: SECRET }), false)
})

test("accepts Cal subscriber verification pings without treating them as bookings", () => {
  assert.equal(isCalWebhookPing(JSON.stringify({ triggerEvent: "PING" })), true)
  assert.equal(isCalWebhookPing(fixture()), false)
  assert.equal(isCalWebhookPing("not-json"), false)
})

test("creates a structured qualified lead without copying arbitrary payload data", () => {
  const parsed = parseCalBookingLead(fixture())
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.lead.email, "founder@example.com")
  assert.equal(parsed.lead.eventTypeId, "8675309")
  assert.equal(parsed.lead.eventTypeSlug, "call")
  assert.equal(parsed.lead.organizerUsername, "axmedia")
  assert.equal(parsed.lead.company, "AX Example")
  assert.equal(parsed.lead.website, "https://example.invalid/")
  assert.equal(parsed.lead.businessType, "B2B SaaS")
  assert.equal(parsed.lead.buyerRole, "Founder / CEO")
  assert.equal(parsed.lead.budgetBand, "$5k–$10k")
  assert.equal(parsed.lead.timeline, "31–90 days")
  assert.equal(parsed.lead.projectContext, "Connect intake and delivery")
  assert.equal(parsed.lead.qualified, true)
  assert.equal(parsed.lead.contextStatus, "QUALIFIED")
  assert.equal(parsed.lead.bookingStatus, "Booked")
  assert.equal(parsed.lead.utmCampaign, "tier_a")
  assert.equal(parsed.lead.landingPage, "/systems/qualified-pipeline")
  assert.equal(parsed.lead.fbclid, "IwAR3_meta_click_ABC123456789")
  assert.equal(parsed.lead.fbc, "fb.1.1755712800000.IwAR3_meta_click_ABC123456789")
  assert.equal(parsed.lead.fbp, "fb.1.1700000000000.987654321")
  assert.equal(parsed.lead.metaAdId, "120249999999990103")
  assert.equal(parsed.lead.creativeLabel, "A_HANDOFFS_STATIC")
  assert.equal("videoCallUrl" in parsed.lead, false)
})

test("rejects mismatched fbclid and fbc attribution", () => {
  const body = JSON.parse(fixture())
  body.payload.metadata.fbc = "fb.1.1755712800000.a_different_click_id"
  assert.deepEqual(parseCalBookingLead(JSON.stringify(body)), {
    ok: false,
    error: "invalid_payload",
  })
})

test("does not falsely qualify a booking without company and project context", () => {
  const parsed = parseCalBookingLead(fixture({ company: "", context: "" }))
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.lead.qualified, false)
  assert.equal(parsed.lead.contextStatus, "NEEDS_CONTEXT")
  assert.deepEqual(parsed.lead.qualificationReasons, ["missing_company", "missing_problem"])
})

test("marks explicit budget and timeline mismatches as NOT_ICP", () => {
  const parsed = parseCalBookingLead(fixture({ budget: "Under $5k", timeline: "Exploring" }))
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.lead.qualified, false)
  assert.equal(parsed.lead.qualificationStatus, "NOT_ICP")
  assert.deepEqual(parsed.lead.qualificationReasons, [
    "budget_below_5k",
    "timeline_beyond_90_days",
  ])
})

test("rejects unsupported events", () => {
  const body = JSON.parse(fixture())
  body.triggerEvent = "MEETING_ENDED"
  assert.deepEqual(parseCalBookingLead(JSON.stringify(body)), {
    ok: false,
    error: "unsupported_trigger",
  })
})

test("rejects a booking payload without an exact event type and organizer", () => {
  const body = JSON.parse(fixture())
  delete body.payload.eventType
  delete body.payload.organizer
  assert.deepEqual(parseCalBookingLead(JSON.stringify(body)), {
    ok: false,
    error: "invalid_payload",
  })
})
