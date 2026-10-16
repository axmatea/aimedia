import assert from "node:assert/strict"
import test from "node:test"
import { registerHooks } from "node:module"

const root = new URL("../../../", import.meta.url)
const events = []
globalThis.__funnelTelemetryTest = events
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/lib/analytics/client") return {
    url: `data:text/javascript,${encodeURIComponent("export function trackEvent(name, properties) { globalThis.__funnelTelemetryTest.push({ name, properties }); }")}`,
    shortCircuit: true,
  }
  if (specifier.startsWith("@/")) return next(new URL(`${specifier.slice(2)}.ts`, root).href, context)
  return next(specifier, context)
} })
const storage = new Map(), dispatched = []
globalThis.window = {
  location: new URL("https://aimedia.global/?utm_source=internal_qa&utm_campaign=offline-test&utm_medium=test&ax_ref=opaque_fixture&email=fixture@example.invalid&fbclid=offline-click-fixture#private-fragment"),
  sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
  dispatchEvent: event => dispatched.push(event),
}
globalThis.document = { referrer: "https://example.invalid/", cookie: "" }
const { trackFunnel } = await import("../../../lib/conversion/track.ts")

test("browser funnel sends approved dimensions without URL identifiers or personal data", () => {
  trackFunnel("page_view")
  assert.deepEqual(events[0], {
    name: "page_view",
    properties: { source: "internal_qa", campaign: "offline-test", medium: "test", path: "/" },
  })
  assert.equal(dispatched[0].type, "axmedia:funnel-event")
  assert.doesNotMatch(JSON.stringify(events), /fixture@example|opaque_fixture|offline-click-fixture|private-fragment/)
})

test("later route and CTA retain first-touch source and campaign", () => {
  window.location = new URL("https://aimedia.global/animated?utm_source=other&utm_campaign=other")
  trackFunnel("primary_cta_clicked")
  assert.deepEqual(events.at(-1), {
    name: "primary_cta_clicked",
    properties: { source: "internal_qa", campaign: "offline-test", medium: "test", path: "/animated" },
  })
})
