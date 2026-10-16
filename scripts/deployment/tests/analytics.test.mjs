import assert from "node:assert/strict"
import test from "node:test"
import { mkdtempSync, rmSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import { spawnSync } from "node:child_process"
import { DatabaseSync } from "node:sqlite"
import { createAnalyticsStore } from "../../../lib/analytics/store.mjs"
import { createAnalyticsHandlers } from "../../../lib/analytics/http.mjs"
import { sanitizeDimensions } from "../../../lib/analytics/schema.mjs"

const fixtureEvent = (dimensions = {}) => ({ name: "page_view", eventId: randomUUID(), visitorId: randomUUID(), dimensions })
const origin = "https://preview.up.railway.app"
const token = "offline-test-token-with-at-least-32-characters"
function fixture(t, options = {}) {
  const dir = mkdtempSync(join(tmpdir(), "ax-analytics-test-"))
  const dbPath = join(dir, "analytics.sqlite")
  const store = createAnalyticsStore({ dbPath, environment: "staging", ...options })
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }) })
  return { dir, dbPath, store }
}
function postRequest(event, options = {}) {
  return new Request(`${origin}/api/analytics/events`, {
    method: "POST", headers: { origin, "content-type": "application/json", ...options.headers },
    body: options.body ?? JSON.stringify(event),
  })
}

test("writes only anonymous allowlisted dimensions; discards URL queries and identity fields", t => {
  const { store, dbPath } = fixture(t)
  const event = fixtureEvent({
    source: "internal_qa", campaign: "migration-check", medium: "email", path: "/animated?email=private@example.invalid#secret",
    ax_ref: "private-prospect", email: "private@example.invalid", ip: "192.0.2.1", referrer: "https://private.invalid/person",
  })
  event.email = "private@example.invalid"
  assert.equal(store.record(event).status, "recorded")
  const db = new DatabaseSync(dbPath, { readOnly: true })
  const rows = db.prepare("SELECT * FROM analytics_events").all()
  db.close()
  assert.equal(rows[0].path, "/animated")
  assert.equal(rows[0].environment, "staging")
  assert.equal(JSON.stringify(rows).includes("private"), false)
  assert.equal(JSON.stringify(rows).includes("192.0.2.1"), false)
  assert.deepEqual(sanitizeDimensions({ source: "john@example.invalid", campaign: "https://private.invalid", medium: "1234567890", path: "/clients/name@example.invalid" }), { source: "direct", campaign: "none", medium: "none", path: "/other" })
})

test("event IDs deduplicate and committed data survives an actual process restart", t => {
  const { store, dbPath } = fixture(t)
  const event = fixtureEvent({ source: "search" })
  assert.equal(store.record(event).status, "recorded")
  assert.equal(store.record(event).status, "duplicate")
  store.close()
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import { createAnalyticsStore } from ${JSON.stringify(new URL("../../../lib/analytics/store.mjs", import.meta.url).href)};
    const store = createAnalyticsStore({ dbPath: process.argv[1], environment: 'staging' });
    const result = store.summary(); store.close();
    if (result.events.page_view !== 1 || result.uniqueSessions !== 1) process.exit(1);
  `, dbPath], { encoding: "utf8" })
  assert.equal(child.status, 0, "separate process reads one persisted event")
})

test("summary isolates environment, excludes internal QA, supports anonymous server events and 90 day retention", t => {
  let now = Date.UTC(2026, 9, 15)
  const { store, dbPath } = fixture(t, { now: () => now })
  store.record(fixtureEvent({ source: "search", campaign: "founders" }))
  store.record(fixtureEvent({ source: "internal_qa" }))
  store.record({ name: "lead_created", eventId: randomUUID(), dimensions: { source: "search" } })
  const production = createAnalyticsStore({ dbPath, environment: "production", now: () => now })
  production.record(fixtureEvent({ source: "production" }))
  assert.equal(store.summary().events.page_view, 1)
  assert.equal(store.summary().events.lead_created, 1)
  assert.equal(store.summary().uniqueSessions, 1)
  assert.equal(store.summary({ includeQa: true }).events.page_view, 2)
  assert.equal(production.summary().events.page_view, 1)
  production.close()
  now += 91 * 86_400_000
  assert.deepEqual(store.summary({ days: 90 }).events, {})
  assert.equal(store.summary({ days: 91 }).status, "rejected")
})

test("unconfigured storage is read-only disabled; storage failures return counts without sensitive errors", t => {
  const { dir, dbPath } = fixture(t)
  const disabled = createAnalyticsStore({ dbPath, environment: undefined })
  assert.equal(disabled.record(fixtureEvent()).status, "disabled")
  assert.equal(existsSync(dbPath), false)
  const unavailable = createAnalyticsStore({ dbPath: dir, environment: "staging" })
  assert.deepEqual(unavailable.record(fixtureEvent()), { status: "error" })
  assert.equal(unavailable.health().errors, 1)
  assert.equal(JSON.stringify(unavailable.summary()).includes(dir), false)
})

test("POST rejects off-origin, invalid schema, server-only names and both declared/streamed oversized bodies", async t => {
  const { store } = fixture(t)
  const { POST } = createAnalyticsHandlers({ env: { PUBLIC_BASE_URL: origin }, store: () => store })
  assert.equal((await POST(postRequest(fixtureEvent(), { headers: { origin: "https://attacker.invalid" } }))).status, 403)
  assert.equal((await POST(postRequest(fixtureEvent(), { headers: { "sec-fetch-site": "cross-site" } }))).status, 403)
  assert.equal((await POST(postRequest({ ...fixtureEvent(), name: "lead_created" }))).status, 400)
  assert.equal((await POST(postRequest({ ...fixtureEvent(), visitorId: "email@example.invalid" }))).status, 400)
  assert.equal((await POST(postRequest(fixtureEvent(), { headers: { "content-length": "4097" } }))).status, 413)
  assert.equal((await POST(postRequest(null, { body: " ".repeat(4097) }))).status, 413)
  assert.equal((await (await POST(postRequest(fixtureEvent(), { headers: { dnt: "1" } }))).json()).status, "skipped")
  assert.equal((await (await POST(postRequest(fixtureEvent(), { headers: { "sec-gpc": "1" } }))).json()).status, "skipped")
  assert.equal((await POST(postRequest(fixtureEvent()))).status, 202)
  assert.equal(store.summary().events.page_view, 1)
})

test("POST bounds session/global request rates and resets after one minute without retaining IPs", async t => {
  const { store } = fixture(t)
  let now = 1
  const { POST } = createAnalyticsHandlers({ env: { RAILWAY_PUBLIC_DOMAIN: "preview.up.railway.app" }, store: () => store, now: () => now })
  const visitorId = randomUUID()
  for (let i = 0; i < 60; i++) assert.equal((await POST(postRequest({ ...fixtureEvent(), visitorId }))).status, 202)
  assert.equal((await POST(postRequest({ ...fixtureEvent(), visitorId }))).status, 429)
  for (let i = 61; i < 300; i++) assert.equal((await POST(postRequest(fixtureEvent()))).status, 202)
  assert.equal((await POST(postRequest(fixtureEvent()))).status, 429)
  now += 60_000
  assert.equal((await POST(postRequest({ ...fixtureEvent(), visitorId }))).status, 202)
})

test("summary requires constant-time bearer auth, limits period, rejects cross-environment reads and returns aggregates only", async t => {
  const { store } = fixture(t)
  store.record(fixtureEvent({ source: "internal_qa" }))
  store.record(fixtureEvent({ source: "search" }))
  const { GET } = createAnalyticsHandlers({ env: { ANALYTICS_READ_TOKEN: token, ANALYTICS_ENVIRONMENT: "staging" }, store: () => store })
  const read = (query = "", bearer = token) => GET(new Request(`${origin}/api/analytics/summary${query}`, { headers: { authorization: `Bearer ${bearer}` } }))
  assert.equal(read("", "bad").status, 401)
  assert.equal(read("?days=91").status, 400)
  assert.equal(read("?environment=production").status, 400)
  const response = read()
  assert.equal(response.headers.get("cache-control"), "no-store")
  const result = await response.json()
  assert.equal(result.events.page_view, 1)
  assert.equal(JSON.stringify(result).includes("visitor_id"), false)
  assert.equal(JSON.stringify(result).includes("event_id"), false)
  assert.equal((await read("?includeQa=1").json()).events.page_view, 2)
})
