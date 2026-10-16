// Offline webhook route test. No CRM, Meta, Cal or analytics provider is called.
import assert from "node:assert/strict"
import test from "node:test"
import { registerHooks } from "node:module"

const state = { callbacks: [], events: [], firstMapped: true, created: true, schedulerThrows: false, analyticsThrows: false }
globalThis.__calTelemetryTest = state
process.env.CAL_WEBHOOK_SECRET = "offline-cal-signature-".repeat(4)
const mock = source => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true })
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "next/server") return mock(`
    export class NextRequest extends Request {}
    export const NextResponse = Response;
    export function after(callback) {
      const state = globalThis.__calTelemetryTest;
      if (state.schedulerThrows) throw new Error("Offline scheduler failure");
      state.callbacks.push(callback);
    }
  `)
  if (specifier.endsWith("/booking-deadline")) return mock(`
    export class BookingBodyTooLargeError extends Error {}
    export class BookingDeadline {
      async wait(run) { return run() }
      async readBody(request) { return request.text() }
      dispose() {}
    }
  `)
  if (specifier.endsWith("/cal-webhook")) return mock(`
    export const MAX_CAL_WEBHOOK_BYTES = 65536;
    export function isCalWebhookPing() { return false }
    export function verifyCalWebhookSignature() { return true }
    export function parseCalBookingLead() { return { ok: true, lead: {
      source: "internal_qa", utmCampaign: "offline-check", utmMedium: "test",
      landingPage: "/", bookingUid: "offline-booking", qualified: false,
      qualificationStatus: "NEEDS_CONTEXT"
    } } }
  `)
  if (specifier.endsWith("/cal-scope")) return mock("export function expectedCalScope() { return {} } export function verifyCalBookingScope() { return true }")
  if (specifier.endsWith("/meta-attribution-allowlist")) return mock("export function verifyMetaAttribution() { return {} }")
  if (specifier.endsWith("/notion-bookings")) return mock(`
    export async function upsertBookingLead() { return {
      created: globalThis.__calTelemetryTest.created,
      firstMapped: globalThis.__calTelemetryTest.firstMapped,
      deduplicated: !globalThis.__calTelemetryTest.firstMapped,
      qualified: false, metaLeadDelivery: { action: "skip" },
      bookingRef: "fixture-booking", canonicalRef: "fixture-lead", structuredFields: 10
    } }
    export async function markMetaLeadSent() { throw new Error("Unexpected Meta mutation") }
  `)
  if (specifier.endsWith("/meta-capi")) return mock("export async function sendMetaLeadEvent() { throw new Error('Unexpected Meta call') }")
  if (specifier === "@/lib/analytics/server") return mock(`
    export async function recordAnalyticsEvent(name, properties) {
      const state = globalThis.__calTelemetryTest;
      if (state.analyticsThrows) throw new Error("Offline analytics failure");
      state.events.push({ name, properties });
    }
  `)
  return next(specifier, context)
} })
globalThis.fetch = async () => { throw new Error("Unexpected network call") }
const { POST } = await import("../../../app/api/webhooks/cal/route.ts")
async function submit() {
  state.callbacks = []; state.events = []
  const response = await POST(new Request("https://example.invalid/api/webhooks/cal", { method: "POST", body: "{}" }))
  assert.equal(response.status, state.created ? 201 : 200)
  assert.equal((await response.json()).ok, true)
}

test("accepted Cal booking defers first-party analytics until after the response", async () => {
  await submit()
  assert.equal(state.callbacks.length, 1)
  assert.equal(state.events.length, 0)
  await state.callbacks[0]()
  assert.deepEqual(state.events.map(event => event.name), ["booking_attributed", "lead_created", "needs_context_lead_created"])
  assert.deepEqual(state.events[0].properties, { source: "internal_qa", campaign: "offline-check", medium: "test", path: "/" })
})
test("Cal retry never repeats the accepted booking analytics", async () => {
  state.firstMapped = false; state.created = false
  await submit()
  assert.equal(state.callbacks.length, 0)
  assert.equal(state.events.length, 0)
  state.firstMapped = true; state.created = true
})
test("collector and scheduler failures cannot turn accepted Cal bookings into retries", async () => {
  const warn = console.warn; console.warn = () => {}
  try {
    state.analyticsThrows = true
    await submit()
    await assert.doesNotReject(state.callbacks[0]())
    state.analyticsThrows = false; state.schedulerThrows = true
    await submit()
    assert.equal(state.callbacks.length, 0)
  } finally { state.analyticsThrows = false; state.schedulerThrows = false; console.warn = warn }
})
