import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { webcrypto } from "node:crypto"
import test from "node:test"
import vm from "node:vm"
import ts from "typescript"
import * as contract from "../../../lib/analytics/schema.ts"

function client(fetch, navigator = { doNotTrack: "0", globalPrivacyControl: false }) {
  const context = vm.createContext({
    exports: {}, crypto: webcrypto, navigator, fetch,
    window: { sessionStorage: { getItem: () => null, setItem() {} } },
    require(name) {
      assert.equal(name, "./schema.ts")
      return contract
    },
  })
  const source = readFileSync(new URL("../../../lib/analytics/client.ts", import.meta.url), "utf8")
  vm.runInContext(ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
  } }).outputText, context)
  return context.exports
}

const settle = () => new Promise(resolve => setImmediate(resolve))

test("analytics drains the ACK asynchronously without changing the event or privacy flags", async () => {
  let resolveResponse, resolveBody, request, consumed = 0
  const response = new Promise(resolve => { resolveResponse = resolve })
  const body = new Promise(resolve => { resolveBody = resolve })
  const analytics = client((url, init) => { request = { url, init }; return response })

  assert.equal(analytics.trackBrowserEvent("page_view", {
    source: "email", campaign: "safe", medium: "email", path: "/animated?ax_ref=private",
  }), undefined)
  assert.equal(consumed, 0)
  assert.equal(request.url, "/api/analytics/events")
  assert.equal(request.init.keepalive, true)
  assert.equal(request.init.credentials, "omit")
  assert.equal(request.init.referrerPolicy, "no-referrer")
  assert.equal(request.init.cache, "no-store")
  const event = JSON.parse(request.init.body)
  assert.ok(contract.validEvent(event, true))
  assert.deepEqual(event.dimensions, { source: "email", campaign: "safe", medium: "email", path: "/animated" })
  assert.doesNotMatch(request.init.body, /ax_ref|private/)

  resolveResponse({ arrayBuffer() { consumed++; return body } })
  await settle()
  assert.equal(consumed, 1)
  resolveBody(new ArrayBuffer(21))
  await settle()
})

test("fetch and ACK-drain errors remain swallowed", async () => {
  for (const fetch of [
    () => Promise.reject(new Error("synthetic offline")),
    () => Promise.resolve({ arrayBuffer: () => Promise.reject(new Error("synthetic interrupted ACK")) }),
    () => Promise.resolve({ arrayBuffer() { throw new Error("synthetic body failure") } }),
  ]) {
    const analytics = client(fetch)
    assert.equal(analytics.trackBrowserEvent("page_view", {}), undefined)
    await settle()
  }
})

test("privacy opt-outs still suppress fetch and ACK handling", async () => {
  let calls = 0
  for (const navigator of [
    { doNotTrack: "1", globalPrivacyControl: false },
    { doNotTrack: "0", globalPrivacyControl: true },
  ]) client(() => { calls++; return Promise.resolve({ arrayBuffer() { calls++ } }) }, navigator).trackBrowserEvent("page_view", {})
  await settle()
  assert.equal(calls, 0)
})
