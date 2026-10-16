// Offline route test: every email/CRM dependency is disabled or replaced.
import assert from "node:assert/strict"
import test from "node:test"
import { registerHooks } from "node:module"

const state = { callbacks: [], events: [], emailCalls: 0, analyticsLoads: 0 }
globalThis.__inquiryTelemetryTest = state
for (const key of ["NOTION_TOKEN", "SHEETS_WEBHOOK_URL", "MARK_CONTACTED_SECRET", "VERCEL"]) delete process.env[key]
process.env.RESEND_API_KEY = "offline-fixture"

const mock = source => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true })
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "next/server") return mock(`
    export class NextRequest extends Request {}
    export const NextResponse = Response;
    export function after(callback) {
      const state = globalThis.__inquiryTelemetryTest;
      if (state.schedulerThrows) throw new Error("Offline scheduler failure");
      state.callbacks.push(callback);
    }
  `)
  if (specifier === "resend") return mock(`
    export class Resend {
      emails = { send: async () => {
        globalThis.__inquiryTelemetryTest.emailCalls++;
        return { data: { id: "offline-email" }, error: null };
      } };
    }
  `)
  if (specifier === "@/lib/followups") return mock("export async function scheduleFollowUps() { return [] }")
  if (specifier === "@/lib/analytics/server") {
    state.analyticsLoads++
    return mock(`export function recordAnalyticsEvent(name, properties) {
      const state = globalThis.__inquiryTelemetryTest;
      state.events.push({ name, properties });
      if (state.analyticsThrows) throw new Error("Offline analytics failure");
      if (state.analyticsRejects) return Promise.reject(new Error("Offline analytics rejection"));
      return Promise.resolve();
    }`)
  }
  return next(specifier, context)
} })
globalThis.fetch = async () => { throw new Error("Unexpected network call in offline inquiry test") }
const { POST } = await import("../../../app/api/booking/route.ts")

async function submit() {
  state.callbacks = []
  state.events = []
  state.emailCalls = 0
  const response = await POST(new Request("https://example.invalid/api/booking", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Offline Fixture", email: "fixture@example.invalid", company: "Fixture", goal: "Offline check", utmCampaign: "offline-test" }),
  }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { success: true, followUps: [] })
  assert.equal(state.emailCalls, 2, "existing owner and prospect email behavior is retained")
}

test("Railway inquiry responds before loading first-party analytics", async () => {
  delete process.env.VERCEL
  await submit()
  assert.equal(state.analyticsLoads, 0)
  assert.equal(state.callbacks.length, 1)
  assert.equal(state.events.length, 0)
})

test("first-party inquiry analytics preserves both events and campaign attribution", async () => {
  await submit()
  assert.equal(state.callbacks.length, 1)
  assert.equal(state.events.length, 0, "analytics is deferred until after response")
  await state.callbacks[0]()
  assert.deepEqual(state.events.map(event => event.name), ["inquiry_submitted", "qualified_lead_created"])
  assert.equal(state.events[0].properties.campaign, "offline-test")
})

test("synchronous or rejected analytics cannot fail a successful inquiry", async () => {
  const warn = console.warn
  console.warn = () => {}
  try {
    for (const failure of ["analyticsThrows", "analyticsRejects"]) {
      state[failure] = true
      await submit()
      await assert.doesNotReject(state.callbacks[0]())
      state[failure] = false
    }
  } finally { console.warn = warn }
})

test("unavailable after-response scheduler cannot fail a successful inquiry", async () => {
  state.schedulerThrows = true
  const warn = console.warn
  console.warn = () => {}
  try {
    await submit()
    assert.equal(state.callbacks.length, 0)
  } finally { state.schedulerThrows = false; console.warn = warn }
})
