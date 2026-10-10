import assert from "node:assert/strict"
import test from "node:test"

import {
  evaluateQualification,
  normalizeBudgetBand,
  normalizeBusinessType,
  normalizeBuyerRole,
  normalizeContactPreference,
  normalizeTimeline,
  normalizeWebsite,
} from "../../../lib/conversion/qualification.ts"

const complete = {
  company: "Verification Company",
  website: "https://example.invalid/",
  businessType: "B2B SaaS" as const,
  buyerRole: "Founder / CEO" as const,
  problem: "Manual lead handoffs",
  serviceNeeded: "Revenue workflow automation",
  budgetBand: "$5k–$10k" as const,
  timeline: "31–90 days" as const,
  preferredContact: "Email" as const,
}

test("qualifies only a complete ICP-fit application", () => {
  assert.deepEqual(evaluateQualification(complete), {
    status: "QUALIFIED",
    qualified: true,
    reasons: [],
  })
})

test("uses NEEDS_CONTEXT for missing or unrecognized required answers", () => {
  assert.deepEqual(evaluateQualification({
    ...complete,
    buyerRole: "",
    preferredContact: "",
  }), {
    status: "NEEDS_CONTEXT",
    qualified: false,
    reasons: ["missing_buyer_role", "missing_contact_preference"],
  })
})

test("explicit ICP mismatch wins over missing context", () => {
  assert.deepEqual(evaluateQualification({
    ...complete,
    businessType: "Other",
    problem: "",
    budgetBand: "Under $5k",
  }), {
    status: "NOT_ICP",
    qualified: false,
    reasons: ["business_type_not_icp", "budget_below_5k", "missing_problem"],
  })
})

test("normalizes the exact Cal choice vocabulary and rejects ambiguous values", () => {
  assert.equal(normalizeBusinessType("software as a service"), "B2B SaaS")
  assert.equal(normalizeBuyerRole("Business owner"), "Founder / CEO")
  assert.equal(normalizeBudgetBand("<$5k"), "Under $5k")
  assert.equal(normalizeBudgetBand("$25k+"), "$25k+")
  assert.equal(normalizeTimeline("within 30 days"), "0–30 days")
  assert.equal(normalizeContactPreference("Whats App"), "WhatsApp")
  assert.equal(normalizeBusinessType("consumer retail"), "")
  assert.equal(normalizeWebsite("javascript:alert(1)"), "")
  assert.equal(normalizeWebsite("example.invalid"), "https://example.invalid/")
})
