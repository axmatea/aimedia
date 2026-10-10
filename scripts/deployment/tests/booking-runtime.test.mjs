// Offline-only Node harness. Next's server-only marker is an empty module in a
// server build; alias resolution below mirrors tsconfig, without changing app code.
import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { registerHooks } from "node:module"
const root = new URL("../../../", import.meta.url)
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true }
  if (specifier.startsWith("@/")) return next(new URL(specifier.slice(2) + ".ts", root).href, context)
  return next(specifier, context)
} })
const { BookingDeadline, BookingDeadlineError } = await import("../../../lib/conversion/booking-deadline.ts")
const { parseCalBookingLead } = await import("../../../lib/conversion/cal-webhook.ts")
const { verifyMetaAttribution } = await import("../../../lib/conversion/meta-attribution-allowlist.ts")
const { upsertBookingLead, markMetaLeadSent } = await import("../../../lib/conversion/notion-bookings.ts")
const { sendMetaLeadEvent } = await import("../../../lib/conversion/meta-capi.ts")
hooks.deregister()
const schemaSource = readFileSync(new URL("lib/conversion/notion-bookings.ts", root), "utf8").match(/const REQUIRED_BOOKING_SCHEMA[^=]*= \{([\s\S]*?)\n\}/)[1]
const schema = Object.fromEntries([...schemaSource.matchAll(/^\s*(?:"([^"]+)"|(\w+)): "([^"]+)"/gm)].map(m => [m[1] || m[2], { type: m[3] }]))
const mapping = { campaignId: "1234561", adSetId: "1234562", adId: "1234563", creativeLabel: "FIXTURE" }
const configured = {
  BOOKING_LOCK_WORKER_URL: "https://lock.example.invalid", BOOKING_LOCK_HMAC_SECRET: "fixture-auth-".repeat(4),
  BOOKING_LOCK_HASH_SECRET: "fixture-digest-".repeat(4), NOTION_TOKEN: "fixture-notion", NOTION_LEADS_DB_ID: "fixture-db",
  META_DATASET_ID: "123456789", META_CAPI_ACCESS_TOKEN: "fixture-meta-".repeat(4), META_GRAPH_API_VERSION: "v99.0",
  META_ATTRIBUTION_ALLOWLIST_JSON: JSON.stringify([mapping]),
}
const parsed = parseCalBookingLead(JSON.stringify({ triggerEvent: "BOOKING_CREATED", createdAt: "2026-08-22T12:30:00.000Z", payload: {
  uid: "fixture-booking", eventType: { id: 5203336, slug: "call" }, organizer: { username: "axmedia" }, status: "ACCEPTED",
  startTime: "2026-08-25T17:00:00.000Z", endTime: "2026-08-25T17:30:00.000Z", attendees: [{ name: "Fixture", email: "fixture@example.invalid" }],
} }))
assert.equal(parsed.ok, true)
const lead = { ...parsed.lead, utmSource: "facebook", utmMedium: "paid_social", metaCampaignId: mapping.campaignId, metaAdSetId: mapping.adSetId, metaAdId: mapping.adId, creativeLabel: mapping.creativeLabel }

async function scenario({ expireAt = 0, lateAt = 0, badReadback = false } = {}) {
  const savedFetch = globalThis.fetch, saved = Object.fromEntries(Object.keys(configured).map(k => [k, process.env[k]]))
  Object.assign(process.env, configured)
  let now = 0, page, release, reached
  const reachedPromise = new Promise(resolve => { reached = resolve })
  const controller = new AbortController()
  const deadline = new BookingDeadline({ timeoutMs: 100, now: () => now, signal: controller.signal })
  const calls = []
  globalThis.fetch = async (input, init = {}) => {
    assert.equal(init.signal, deadline.signal)
    const url = new URL(String(input)), body = init.body ? JSON.parse(init.body) : null
    calls.push({ path: url.pathname, method: init.method || "GET", body })
    let response
    if (url.pathname === "/v1/reserve") response = Response.json({ status: "ACQUIRED", operationId: body.operationId }, { status: 201 })
    else if (url.pathname === "/v1/commit") response = Response.json({ status: "COMMITTED", canonicalRef: body.canonicalRef })
    else if (url.pathname.endsWith("/query")) response = Response.json({ results: [] })
    else if (url.pathname.includes("/databases/")) response = Response.json({ properties: schema })
    else if (url.hostname === "graph.facebook.com") response = Response.json({ events_received: 1 })
    else if (init.method === "POST") { page = { id: "fixture-page", properties: body.properties }; response = Response.json(page) }
    else if (init.method === "PATCH") { page.properties = { ...page.properties, ...body.properties }; response = Response.json(page) }
    else response = Response.json(badReadback ? { ...page, properties: {} } : page)
    if (calls.length === expireAt) now = 101
    if (calls.length === lateAt) { reached(); return new Promise(resolve => { release = () => resolve(response) }) }
    return response
  }
  async function workflow() {
    const result = await upsertBookingLead(lead, verifyMetaAttribution(lead), deadline)
    const delivery = await sendMetaLeadEvent(result.deliveryLead, result.metaAttribution.mapping, deadline)
    await markMetaLeadSent({ recordId: result.recordId, bookingUid: lead.bookingUid, eventId: delivery.eventId }, deadline)
    return result
  }
  try {
    const pending = workflow()
    if (lateAt) {
      await reachedPromise
      controller.abort()
      await assert.rejects(pending, BookingDeadlineError)
      release()
      await new Promise(resolve => setImmediate(resolve))
      assert.equal(calls.length, lateAt, "late result cannot start another call")
    } else if (expireAt) {
      await assert.rejects(pending, BookingDeadlineError)
      assert.equal(calls.length, expireAt, "expired response cannot start another call")
    } else if (badReadback) {
      controller.abort()
      await assert.rejects(pending, BookingDeadlineError)
    } else {
      const result = await pending
      assert.equal(result.created, true)
      assert.equal(calls.length, 10)
      assert.equal(calls[7].body.data[0].event_id, "cal:fixture-booking")
    }
    assert.equal(calls.some(c => /unlock|release/.test(c.path)), false)
    return calls
  } finally {
    deadline.dispose(); globalThis.fetch = savedFetch
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v }
  }
}

test("complete offline CRM, lock and CAPI sequence uses one signal and deterministic event", async () => { await scenario() })
for (let boundary = 1; boundary <= 10; boundary++) {
  test(`monotonic expiry at provider boundary ${boundary} prevents subsequent calls`, async () => { await scenario({ expireAt: boundary }) })
  test(`late uncooperative provider boundary ${boundary} cannot resume mutations`, async () => { await scenario({ lateAt: boundary }) })
}

test("all provider fetches and retry delays in recovered booking flow use the shared budget", () => {
  for (const file of ["booking-lock.ts", "notion-bookings.ts", "meta-capi.ts"]) {
    const source = readFileSync(new URL(`lib/conversion/${file}`, root), "utf8")
    assert.doesNotMatch(source, /await fetch\(/)
    assert.doesNotMatch(source, /response\.json\(/)
    assert.doesNotMatch(source, /setTimeout\(/)
  }
  const route = readFileSync(new URL("app/api/webhooks/cal/route.ts", root), "utf8")
  assert.match(route, /process\.env\.VERCEL && result\.firstMapped/)
  assert.doesNotMatch(route, /await Promise\.allSettled/)
})
