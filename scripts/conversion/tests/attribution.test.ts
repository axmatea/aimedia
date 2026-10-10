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

test("captures a Meta first touch and forwards privacy-safe booking attribution", () => {
  const fbclid = "IwAR3_meta_click_ABC123456789"
  const capturedAt = "2026-08-20T18:00:00.000Z"
  const attribution = attributionFromLocation(
    `https://aimedia.global/systems/qualified-pipeline?utm_source=facebook&utm_medium=paid_social&utm_campaign=proof&utm_content=A_HANDOFFS_STATIC&ax_ref=120249999999990103&meta_campaign_id=120249999999990101&meta_adset_id=120249999999990102&meta_ad_id=120249999999990103&fbclid=${fbclid}`,
    "https://www.facebook.com/",
    capturedAt,
    "_fbc=fb.1.1700000000000.stale_click_123; _fbp=fb.1.1700000000000.987654321",
  )
  const config = calAttributionConfig(attribution)

  assert.equal(attribution.fbclid, fbclid)
  assert.equal(attribution.fbc, `fb.1.${Date.parse(capturedAt)}.${fbclid}`)
  assert.equal(attribution.fbp, "fb.1.1700000000000.987654321")
  assert.equal(config["metadata[fbclid]"], fbclid)
  assert.equal(config["metadata[fbc]"], attribution.fbc)
  assert.equal(config["metadata[fbp]"], attribution.fbp)
  assert.equal(attribution.metaCampaignId, "120249999999990101")
  assert.equal(attribution.metaAdSetId, "120249999999990102")
  assert.equal(attribution.metaAdId, "120249999999990103")
  assert.equal(attribution.creativeLabel, "A_HANDOFFS_STATIC")
  assert.equal(config["metadata[metaAdId]"], attribution.metaAdId)
})

test("uses a numeric ax_ref as the exact ad ID and drops malformed Meta object IDs", () => {
  const exact = attributionFromLocation(
    "https://aimedia.global/?ax_ref=120249999999990103&utm_content=C_ONE_SYSTEM_VIDEO",
  )
  const malformed = attributionFromLocation(
    "https://aimedia.global/?ax_ref=opaque_ref_123&meta_ad_id=%7B%7Bad.id%7D%7D&meta_campaign_id=not-an-id",
  )
  assert.equal(exact.metaAdId, "120249999999990103")
  assert.equal(exact.creativeLabel, "C_ONE_SYSTEM_VIDEO")
  assert.equal(malformed.metaAdId, "")
  assert.equal(malformed.metaCampaignId, "")
})

test("drops malformed Meta identifiers instead of forwarding arbitrary values", () => {
  const attribution = attributionFromLocation(
    "https://aimedia.global/?fbclid=%3Cscript%3E",
    "",
    "2026-08-20T18:00:00.000Z",
    "_fbc=bad; _fbp=also-bad",
  )
  assert.equal(attribution.fbclid, "")
  assert.equal(attribution.fbc, "")
  assert.equal(attribution.fbp, "")
})

test("redacts sensitive and prospect-mapping parameters from analytics URLs", () => {
  const redacted = new URL(redactAnalyticsUrl(
    "https://aimedia.global/?utm_source=outbound&ax_ref=ref_123456&email=private@example.com&fbclid=meta_click_123&_fbc=fb.1.1.click&_fbp=fb.1.1.browser",
  ))
  assert.equal(redacted.searchParams.get("utm_source"), "outbound")
  assert.equal(redacted.searchParams.has("ax_ref"), false)
  assert.equal(redacted.searchParams.has("email"), false)
  assert.equal(redacted.searchParams.has("fbclid"), false)
  assert.equal(redacted.searchParams.has("_fbc"), false)
  assert.equal(redacted.searchParams.has("_fbp"), false)
})
