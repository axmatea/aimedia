import assert from "node:assert/strict"
import test from "node:test"
import { randomUUID } from "node:crypto"
import { trackEvent } from "../../../lib/analytics/client.ts"

test("browser transport shares one anonymous tab session, excludes PII, honors privacy and never throws on failures", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator")
  const originalFetch = globalThis.fetch
  const requests = []
  const storage = new Map()
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    crypto: { randomUUID }, location: { pathname: "/animated" },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  } })
  const navigator = { doNotTrack: "0", globalPrivacyControl: false }
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: navigator })
  globalThis.fetch = async (url, options) => { requests.push({ url, ...options }); return new Response(null, { status: 202 }) }
  try {
    trackEvent("page_view", { source: "search", email: "private@example.invalid", ax_ref: "private" })
    trackEvent("booking_opened", { campaign: "founders" })
    const [first, second] = requests.map(request => JSON.parse(request.body))
    assert.equal(first.visitorId, second.visitorId)
    assert.notEqual(first.eventId, second.eventId)
    assert.equal(requests[0].url, "/api/analytics/events")
    assert.equal(requests[0].keepalive, true)
    assert.equal(requests[0].credentials, "omit")
    assert.equal(requests[0].referrerPolicy, "no-referrer")
    assert.equal(JSON.stringify(requests).includes("private"), false)
    navigator.doNotTrack = "1"
    trackEvent("page_view")
    navigator.doNotTrack = "0"
    navigator.globalPrivacyControl = true
    trackEvent("page_view")
    assert.equal(requests.length, 2)
    navigator.globalPrivacyControl = false
    globalThis.fetch = async () => { throw new Error("offline fixture") }
    assert.doesNotThrow(() => trackEvent("booking_completed"))
    await new Promise(resolve => setImmediate(resolve))
    window.crypto.randomUUID = () => { throw new Error("restricted browser fixture") }
    assert.doesNotThrow(() => trackEvent("booking_started"))
  } finally {
    globalThis.fetch = originalFetch
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow)
    else delete globalThis.window
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator)
    else delete globalThis.navigator
  }
})
