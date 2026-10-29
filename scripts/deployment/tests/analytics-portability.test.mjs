import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { randomUUID, webcrypto } from "node:crypto"
import { DatabaseSync } from "node:sqlite"
import test from "node:test"
import vm from "node:vm"
import ts from "typescript"
import * as contract from "../../../lib/analytics/schema.ts"
import { recordAnalyticsEvent } from "../../../lib/analytics/store.ts"
import { createAnalyticsHandler, sameAnalyticsOrigin } from "../../../lib/analytics/http.ts"

const read = file => readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8")
const fixture = (overrides = {}) => ({
  eventId: randomUUID(), visitorId: randomUUID(), name: "page_view",
  dimensions: { source: "email", campaign: "qualified-pipeline", medium: "email", path: "/animated" },
  ...overrides,
})

function sqlRuntime(environment = "staging", db = new DatabaseSync(":memory:")) {
  db.exec(read("lib/analytics/schema.sql"))
  const tasks = []
  return { sql: db, tasks, runtime: {
    environment,
    db: { prepare: query => ({ bind: (...values) => ({ run: async () => db.prepare(query).run(...values) }) }) },
    waitUntil: task => { tasks.push(task) },
  } }
}

function loadTs(file, require, extra = {}) {
  const context = vm.createContext({ exports: {}, require, console, crypto: webcrypto, ...extra })
  const code = ts.transpileModule(read(file), { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  vm.runInContext(code, context)
  return context.exports
}

test("analytics schema retains only safe dimensions and known public paths", () => {
  assert.deepEqual(contract.sanitizeDimensions({ source: "EMAIL", campaign: "pipeline-test", medium: "email", path: "/animated?ax_ref=private#email=hidden" }), {
    source: "email", campaign: "pipeline-test", medium: "email", path: "/animated",
  })
  for (const campaign of ["fixture@example.invalid", "https://example.invalid", "private?ax_ref=123", "ip-203.0.113.42", "call-415-555-1234", "ax_ref-private", "prospect-abc123", "tel15555555555", "abc".repeat(50), "abc123456789012345678901234567890", "one\ntwo", "55a5da09-5c9e-442a-8dd4-922f43b4b6cc"]) {
    assert.equal(contract.sanitizeDimensions({ campaign }).campaign, "none")
  }
  assert.deepEqual(contract.sanitizeDimensions({ source: "private-person.invalid", campaign: "safe", path: "/private/person@example.invalid", medium: "person@example.invalid" }), {
    source: "other", campaign: "safe", path: "/other", medium: "none",
  })
  assert.equal(contract.sanitizeDimensions({ path: "https://aimedia.global/animated?email=fixture@example.invalid" }).path, "/animated")
  for (const [source, expected] of [["www.google.com", "google"], ["google.co.uk", "google"], ["l.instagram.com", "instagram"], ["www.linkedin.com", "linkedin"], ["l.facebook.com", "facebook"]]) {
    assert.equal(contract.sanitizeDimensions({ source }).source, expected)
  }
})

test("browser ingestion cannot claim server conversions or smuggle fields/identifiers", () => {
  const input = fixture()
  assert.ok(contract.validEvent(input, true))
  for (const patch of [
    { name: "qualified_lead_created" }, { eventId: "private-reference" }, { visitorId: "person@example.invalid" },
    { visitorId: null }, { email: "fixture@example.invalid" }, { timestamp: "untrusted" },
    { dimensions: { source: "email", ax_ref: "private-ref" } }, { dimensions: [] },
  ]) assert.equal(contract.validEvent({ ...input, ...patch }, true), null)
  assert.ok(contract.validEvent(fixture({ name: "qualified_lead_created", visitorId: null })))
})

test("real SQL deduplicates exact events, separates staging and production and applies retention", async () => {
  const { sql, runtime, tasks } = sqlRuntime()
  try {
    const now = Date.UTC(2026, 9, 29)
    const input = fixture()
    assert.equal((await recordAnalyticsEvent(runtime, input, now)).status, "accepted")
    await recordAnalyticsEvent(runtime, input, now)
    await Promise.all(tasks)
    assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM analytics_events").get().count, 1)
    await recordAnalyticsEvent({ ...runtime, environment: "production" }, input, now)
    assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM analytics_events").get().count, 2)
    const columns = sql.prepare("PRAGMA table_info(analytics_events)").all().map(row => row.name)
    assert.deepEqual(columns, ["event_id", "environment", "name", "visitor_id", "source", "campaign", "medium", "path", "recorded_at"])
    await recordAnalyticsEvent(runtime, fixture(), now + 91 * 86_400_000)
    await Promise.all(tasks)
    assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM analytics_events").get().count, 1)
  } finally { sql.close() }
})

test("D1 errors are unavailable telemetry, not thrown transaction failures", async () => {
  const runtime = { environment: "staging", db: { prepare() { throw new Error("synthetic missing table") } }, waitUntil() {} }
  assert.deepEqual(await recordAnalyticsEvent(runtime, fixture()), { status: "unavailable" })
  assert.deepEqual(await recordAnalyticsEvent(runtime, { ...fixture(), email: "private" }), { status: "rejected" })
})

const request = (input = fixture(), headers = {}) => new Request("https://site.example.invalid/api/analytics/events", {
  method: "POST", headers: { Origin: "https://site.example.invalid", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json", ...headers },
  body: typeof input === "string" ? input : JSON.stringify(input),
})

test("only same-port HTTP loopback aliases accommodate the local OpenNext bridge; remote origins stay exact", async () => {
  const local = (target, origin, extra = {}) => new Request(`${target}/api/analytics/events`, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...extra }, body: JSON.stringify(fixture()),
  })
  for (const [target, origin] of [
    ["http://localhost:4214", "http://127.0.0.1:4214"],
    ["http://127.0.0.1:4214", "http://localhost:4214"],
    ["http://[::1]:4214", "http://localhost:4214"],
    ["https://aimedia.global", "https://aimedia.global"],
  ]) assert.equal(sameAnalyticsOrigin(local(target, origin)), true)
  for (const [target, origin] of [
    ["http://localhost:4214", "http://127.0.0.1:4215"],
    ["http://localhost:4214", "https://localhost:4214"],
    ["https://localhost:4214", "http://localhost:4214"],
    ["http://localhost:4214", "http://localhost.attacker.invalid:4214"],
    ["http://localhost:4214", "http://127.0.0.2:4214"],
    ["http://0.0.0.0:4214", "http://localhost:4214"],
    ["https://aimedia.global", "http://aimedia.global"],
    ["https://aimedia.global", "http://localhost:4214"],
    ["https://aimedia.global", "https://www.aimedia.global"],
    ["https://aimedia.global", "null"],
    ["https://aimedia.global", "https://aimedia.global/hidden"],
  ]) assert.equal(sameAnalyticsOrigin(local(target, origin, { "X-Forwarded-Host": "localhost:4214" })), false)
  const { sql, runtime, tasks } = sqlRuntime()
  try {
    assert.equal((await createAnalyticsHandler()(local("http://localhost:4214", "http://127.0.0.1:4214"), runtime)).status, 202)
    await Promise.all(tasks)
    assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM analytics_events").get().count, 1)
  } finally { sql.close() }
})

test("collector checks origin, fetch context, privacy, type, size, missing binding and strict schema before storage", async () => {
  const { sql, runtime, tasks } = sqlRuntime()
  const handle = createAnalyticsHandler()
  try {
    for (const [req, expected] of [
      [request(fixture(), { Origin: "https://attacker.example.invalid" }), 403],
      [request(fixture(), { "Sec-Fetch-Site": "cross-site" }), 403],
      [request(fixture(), { "Content-Type": "text/plain" }), 415],
      [request(fixture(), { "Content-Length": "3000" }), 413],
      [request("x".repeat(3000)), 413],
      [request("{bad-json"), 400],
      [request(fixture({ name: "lead_created" })), 400],
      [request(fixture({ dimensions: { path: "/", email: "fixture@example.invalid" } })), 400],
    ]) assert.equal((await handle(req, runtime)).status, expected)
    assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM analytics_events").get().count, 0)
    for (const privacy of [{ DNT: "1" }, { "Sec-GPC": "1" }]) assert.equal((await (await handle(request(fixture(), privacy), runtime)).json()).status, "skipped")
    assert.equal((await handle(request(), null)).status, 503)
    const accepted = await handle(request(), runtime)
    assert.equal(accepted.status, 202)
    assert.equal(accepted.headers.get("cache-control"), "no-store")
    await Promise.all(tasks)
    assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM analytics_events").get().count, 1)
  } finally { sql.close() }
})

test("collector's bounded session rate guard recovers after one window", async () => {
  const { sql, runtime, tasks } = sqlRuntime()
  let now = Date.UTC(2026, 9, 29)
  const handle = createAnalyticsHandler({ now: () => now })
  const visitorId = randomUUID()
  try {
    for (let i = 0; i < 60; i++) assert.equal((await handle(request(fixture({ visitorId })), runtime)).status, 202)
    assert.equal((await handle(request(fixture({ visitorId })), runtime)).status, 429)
    now += 60_000
    assert.equal((await handle(request(fixture({ visitorId })), runtime)).status, 202)
    await Promise.all(tasks)
  } finally { sql.close() }
})

test("runtime is harmless outside Worker requests and requires explicit environment plus binding", () => {
  let context
  const runtime = loadTs("lib/analytics/runtime.ts", name => {
    if (name === "server-only") return {}
    if (name === "@opennextjs/cloudflare") return { getCloudflareContext() { if (!context) throw new Error("No request context"); return context } }
    throw new Error(`Unexpected import ${name}`)
  })
  assert.equal(runtime.getAnalyticsRuntime(), null)
  context = { env: {}, ctx: { waitUntil() {} } }
  assert.equal(runtime.getAnalyticsRuntime(), null)
  context.env.ANALYTICS_DB = { prepare() {} }
  assert.equal(runtime.getAnalyticsRuntime(), null)
  context.env.ANALYTICS_ENVIRONMENT = "staging"
  assert.equal(runtime.getAnalyticsRuntime().environment, "staging")
  context.env.ANALYTICS_ENVIRONMENT = "production"
  assert.equal(runtime.getAnalyticsRuntime().environment, "production")
})

test("server tracking registers nonblocking work and never passes CRM identity to D1", async () => {
  let runtime, received
  const tasks = []
  const pending = new Promise(resolve => tasks.push(resolve))
  const server = loadTs("lib/analytics/server.ts", name => {
    if (name === "server-only") return {}
    if (name === "./runtime.ts") return { getAnalyticsRuntime: () => runtime }
    if (name === "./schema.ts") return contract
    if (name === "./store.ts") return { recordAnalyticsEvent(_runtime, input) { received = input; return pending } }
    throw new Error(`Unexpected import ${name}`)
  })
  assert.doesNotThrow(() => server.trackServerEvent("lead_created"))
  let scheduled
  runtime = { waitUntil: task => { scheduled = task } }
  assert.equal(server.trackServerEvent("lead_created", { source: "email", campaign: "safe", email: "fixture@example.invalid", bookingUid: "private", path: "/?ax_ref=private" }), undefined)
  assert.ok(scheduled instanceof Promise)
  assert.deepEqual(JSON.parse(JSON.stringify(received.dimensions)), { source: "email", campaign: "safe", medium: "none", path: "/" })
  tasks[0]()
  await scheduled
  runtime = { waitUntil() { throw new Error("synthetic context gone") } }
  assert.doesNotThrow(() => server.trackServerEvent("lead_created"))
})

test("browser sends minimal same-origin payload without cookies/referrer and tolerates privacy/storage/network restrictions", async () => {
  const calls = []
  let privateMode = false
  const browser = { sessionStorage: { getItem() { if (privateMode) throw new Error("blocked"); return null }, setItem() { if (privateMode) throw new Error("blocked") } } }
  const navigator = { doNotTrack: "1", globalPrivacyControl: false }
  const client = loadTs("lib/analytics/client.ts", () => contract, {
    window: browser, navigator, fetch: (...args) => { calls.push(args); return Promise.reject(new Error("synthetic offline")) },
  })
  client.trackBrowserEvent("page_view", {})
  assert.equal(calls.length, 0)
  navigator.doNotTrack = "0"; navigator.globalPrivacyControl = true
  client.trackBrowserEvent("page_view", {})
  assert.equal(calls.length, 0)
  navigator.globalPrivacyControl = false; privateMode = true
  client.trackBrowserEvent("page_view", { source: "email", campaign: "safe", path: "/animated?ax_ref=hidden", email: "fixture@example.invalid" })
  client.trackBrowserEvent("booking_opened", { source: "email" })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls.length, 2)
  const [url, init] = calls[0], data = JSON.parse(init.body)
  assert.equal(url, "/api/analytics/events")
  assert.equal(init.credentials, "omit")
  assert.equal(init.referrerPolicy, "no-referrer")
  assert.equal(init.keepalive, true)
  assert.ok(contract.validEvent(data, true))
  assert.doesNotMatch(init.body, /ax_ref|fixture@example|email=/)
  assert.equal(data.visitorId, JSON.parse(calls[1][1].body).visitorId)
})

test("page analytics tracks SPA navigation once and does not make query changes a new landing", () => {
  const refs = [], events = []
  let index = 0, effect, pathname = "/"
  const component = loadTs("components/analytics/funnel-analytics.tsx", name => {
    if (name === "react") return { useRef(value) { return refs[index++] ??= { current: value } }, useEffect(callback) { effect = callback } }
    if (name === "next/navigation") return { usePathname: () => pathname }
    if (name === "@/lib/conversion/track") return { trackFunnel: event => events.push(event) }
    throw new Error(`Unexpected import ${name}`)
  })
  const render = () => { index = 0; component.FunnelAnalytics(); effect() }
  render(); render()
  assert.deepEqual(events, ["page_view", "landing_viewed"])
  pathname = "/animated"; render(); render()
  assert.deepEqual(events, ["page_view", "landing_viewed", "page_view"])
})

test("lead telemetry is provider-independent, nonblocking and still guarded by first booking mapping", () => {
  const cal = read("app/api/webhooks/cal/route.ts"), booking = read("app/api/booking/route.ts")
  for (const file of [cal, booking, read("lib/conversion/track.ts"), read("components/analytics/funnel-analytics.tsx")]) assert.doesNotMatch(file, /@vercel\/analytics/)
  assert.match(cal, /if \(result\.firstMapped\)/)
  assert.doesNotMatch(cal, /process\.env\.VERCEL|await trackServerEvent/)
  assert.doesNotMatch(booking.slice(booking.indexOf("const telemetry =")), /await Promise\.allSettled|await trackServerEvent/)
  assert.match(read("app/layout.tsx"), /<FunnelAnalytics \/>/)
})
