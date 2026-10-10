import assert from "node:assert/strict"
import test from "node:test"

import type { StructuredBookingLead } from "../../../lib/conversion/cal-webhook.ts"
import {
  MetaAttributionConfigError,
  parseMetaAttributionAllowlist,
  verifyMetaAttribution,
} from "../../../lib/conversion/meta-attribution-allowlist.ts"

const mapping = {
  campaignId: "120249999999990101",
  adSetId: "120249999999990102",
  adId: "120249999999990103",
  creativeLabel: "A_HANDOFFS_STATIC",
}

const lead = {
  utmSource: "facebook",
  utmMedium: "paid_social",
  fbclid: "IwAR3_meta_click_ABC123456789",
  fbc: "fb.1.1755712800000.IwAR3_meta_click_ABC123456789",
  metaCampaignId: mapping.campaignId,
  metaAdSetId: mapping.adSetId,
  metaAdId: mapping.adId,
  creativeLabel: mapping.creativeLabel,
} as StructuredBookingLead

test("verifies only an exact campaign/ad-set/ad/creative tuple", () => {
  const allowlist = JSON.stringify([mapping])
  assert.deepEqual(verifyMetaAttribution(lead, allowlist), {
    status: "VERIFIED",
    verified: true,
    mapping,
  })
  assert.deepEqual(verifyMetaAttribution({ ...lead, creativeLabel: "SPOOFED" }, allowlist), {
    status: "UNVERIFIED",
    verified: false,
    reason: "exact_mapping_not_found",
  })
  assert.deepEqual(verifyMetaAttribution({ ...lead, metaAdId: "120249999999990999" }, allowlist), {
    status: "UNVERIFIED",
    verified: false,
    reason: "exact_mapping_not_found",
  })
})

test("a public fbclid cannot become verified without the server allowlist", () => {
  assert.throws(
    () => verifyMetaAttribution(lead, ""),
    (error) => error instanceof MetaAttributionConfigError && error.code === "meta_allowlist_missing",
  )
})

test("rejects malformed and duplicate allowlist entries", () => {
  assert.throws(() => parseMetaAttributionAllowlist("not-json"), MetaAttributionConfigError)
  assert.throws(() => parseMetaAttributionAllowlist(JSON.stringify([mapping, mapping])), MetaAttributionConfigError)
})

test("ordinary non-Meta bookings do not require an allowlist", () => {
  assert.deepEqual(verifyMetaAttribution({
    ...lead,
    utmSource: "",
    utmMedium: "",
    fbclid: "",
    fbc: "",
    metaAdId: "",
  }, ""), {
    status: "NOT_META",
    verified: false,
    reason: "no_meta_signal",
  })
})
