import assert from "node:assert/strict"
import test from "node:test"

import {
  attributionFromLocation,
  attributedCalUrl,
  calAttributionConfig,
  redactAnalyticsUrl,
} from "../../../lib/conversion/attribution.ts"

test("captures only allowlisted campaign attribution and an opaque reference", () => {
  const attribution = attributionFromLocation(
    "https://aimedia.global/?utm_source=linkedin&utm_medium=founder_post&utm_campaign=ops&utm_content=workflow&ax_ref=opaque_ABC123&email=private@example.com",
    "https://www.linkedin.com/feed/",
    "2026-08-20T18:00:00.000Z",
  )

  assert.equal(attribution.source, "linkedin")
  assert.equal(attribution.utmCampaign, "ops")
  assert.equal(attribution.attributionRef, "opaque_ABC123")
  assert.equal(attribution.referrerHost, "www.linkedin.com")
  assert.equal("email" in attribution, false)
})

test("passes campaign and non-identifying metadata to Cal with a 30-minute default", () => {
  const attribution = attributionFromLocation(
    "https://aimedia.global/systems?utm_source=outbound&utm_campaign=tier_a&ax_ref=ref_123456",
    "",
    "2026-08-20T18:00:00.000Z",
  )
  const config = calAttributionConfig(attribution)
  const url = new URL(attributedCalUrl("https://cal.com/axmedia/call", attribution))

  assert.equal(config.utm_source, "outbound")
  assert.equal(config["metadata[landingPath]"], "/systems")
  assert.equal(config["metadata[attributionRef]"], "ref_123456")
  assert.equal(url.searchParams.get("duration"), "30")
  assert.equal(url.searchParams.get("utm_campaign"), "tier_a")
})

test("redacts sensitive and prospect-mapping parameters from analytics URLs", () => {
  const redacted = new URL(redactAnalyticsUrl(
    "https://aimedia.global/?utm_source=outbound&ax_ref=ref_123456&email=private@example.com",
  ))
  assert.equal(redacted.searchParams.get("utm_source"), "outbound")
  assert.equal(redacted.searchParams.has("ax_ref"), false)
  assert.equal(redacted.searchParams.has("email"), false)
})
