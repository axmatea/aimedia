import assert from "node:assert/strict"
import test from "node:test"
import { registerHooks } from "node:module"

let mutations = 0
globalThis.__migrationGuardMutation = () => { mutations++; throw new Error("Unexpected provider access") }
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "next/server") return {
    url: `data:text/javascript,${encodeURIComponent("export class NextRequest {} export const NextResponse = { json: (data,init) => Response.json(data,init) };")}`, shortCircuit: true,
  }
  if (specifier === "resend") return {
    url: `data:text/javascript,${encodeURIComponent("export class Resend { constructor() { globalThis.__migrationGuardMutation(); } }")}`, shortCircuit: true,
  }
  if (specifier === "@/lib/notionLeads") return {
    url: `data:text/javascript,${encodeURIComponent("export const findLeadByEmail = (...args) => globalThis.__migrationGuardMutation(...args); export const findLeadByEmailId = findLeadByEmail; export const markFollowUpStatus = findLeadByEmail; export const markBounced = findLeadByEmail; export const markComplained = findLeadByEmail; export const markEngagement = findLeadByEmail;")}`, shortCircuit: true,
  }
  if (specifier === "@/lib/cancelFollowUps") return {
    url: `data:text/javascript,${encodeURIComponent("export const cancelScheduled = (...args) => globalThis.__migrationGuardMutation(...args);")}`, shortCircuit: true,
  }
  return next(specifier, context)
} })

const { POST: cancel } = await import("../../../app/api/booking/cancel-followups/route.ts")
const { POST: resendWebhook } = await import("../../../app/api/webhooks/resend/route.ts")

test("missing cancellation secret blocks writes before parsing any supplied identity", async () => {
  delete process.env.CANCEL_FOLLOWUPS_SECRET
  const response = await cancel(new Request("https://example.invalid", { method: "POST", body: '{"email":"fixture@example.invalid"}' }))
  assert.equal(response.status, 503)
  assert.equal(mutations, 0)
})

test("incorrect cancellation secret never reaches providers", async () => {
  process.env.CANCEL_FOLLOWUPS_SECRET = "fixture-only-secret"
  const response = await cancel(new Request("https://example.invalid", { method: "POST", body: '{"email":"fixture@example.invalid","secret":"wrong"}' }))
  assert.equal(response.status, 401)
  assert.equal(mutations, 0)
})

test("missing or invalid Resend signature never reaches providers", async () => {
  delete process.env.RESEND_WEBHOOK_SECRET
  let response = await resendWebhook(new Request("https://example.invalid", { method: "POST", body: '{}' }))
  assert.equal(response.status, 503)
  process.env.RESEND_WEBHOOK_SECRET = `whsec_${Buffer.from("fixture-only-secret").toString("base64")}`
  response = await resendWebhook(new Request("https://example.invalid", { method: "POST", body: '{}' }))
  assert.equal(response.status, 401)
  assert.equal(mutations, 0)
})
