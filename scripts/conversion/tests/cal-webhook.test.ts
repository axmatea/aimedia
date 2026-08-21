import assert from "node:assert/strict"
import crypto from "node:crypto"
import test from "node:test"

import {
  parseCalBookingLead,
  verifyCalWebhookSignature,
} from "../../../lib/conversion/cal-webhook.ts"

const SECRET = "local-cal-test-secret-with-at-least-32-characters"

function fixture({ company = "AX Example", context = "Connect intake and delivery" } = {}) {
  return JSON.stringify({
    triggerEvent: "BOOKING_CREATED",
    createdAt: "2026-08-20T18:30:00.000Z",
    payload: {
      uid: "booking_uid_123",
      status: "ACCEPTED",
      startTime: "2026-08-24T17:00:00.000Z",
      endTime: "2026-08-24T17:30:00.000Z",
      attendees: [{ name: "Founder Name", email: "Founder@Example.com" }],
      responses: {
        attendeePhoneNumber: { label: "Phone number", value: "+14155550123" },
        company: { label: "Company", value: company },
        notes: { label: "What should we solve?", value: context },
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

test("creates a structured qualified lead without copying arbitrary payload data", () => {
  const parsed = parseCalBookingLead(fixture())
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.lead.email, "founder@example.com")
  assert.equal(parsed.lead.company, "AX Example")
  assert.equal(parsed.lead.projectContext, "Connect intake and delivery")
  assert.equal(parsed.lead.qualified, true)
  assert.equal(parsed.lead.contextStatus, "QUALIFIED")
  assert.equal(parsed.lead.bookingStatus, "Booked")
  assert.equal(parsed.lead.utmCampaign, "tier_a")
  assert.equal(parsed.lead.landingPage, "/systems/qualified-pipeline")
  assert.equal("videoCallUrl" in parsed.lead, false)
})

test("does not falsely qualify a booking without company and project context", () => {
  const parsed = parseCalBookingLead(fixture({ company: "", context: "" }))
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.lead.qualified, false)
  assert.equal(parsed.lead.contextStatus, "NEEDS CONTEXT")
})

test("rejects unsupported events", () => {
  const body = JSON.parse(fixture())
  body.triggerEvent = "MEETING_ENDED"
  assert.deepEqual(parseCalBookingLead(JSON.stringify(body)), {
    ok: false,
    error: "unsupported_trigger",
  })
})
