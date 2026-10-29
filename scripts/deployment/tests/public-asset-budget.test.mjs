import assert from "node:assert/strict"
import { readFileSync, statSync } from "node:fs"
import test from "node:test"

const root = new URL("../../../", import.meta.url)
const headers = readFileSync(new URL("public/_headers", root), "utf8")

test("the canonical wordmark uses a small derived asset without replacing the source", () => {
  const component = readFileSync(new URL("components/ui/ax-wordmark.tsx", root), "utf8")
  const asset = new URL("public/brand/ax-wordmark-512-v1.webp", root)
  assert.match(component, /src="\/brand\/ax-wordmark-512-v1\.webp"/)
  assert.match(component, /width=\{1022\} height=\{549\}/)
  assert.match(component, /rel="preload" as="image" href="\/brand\/ax-wordmark-512-v1\.webp"/)
  assert.ok(statSync(asset).size < 40_000, "Wordmark must stay below 40 KB")
  assert.ok(statSync(new URL("public/ax-logo-clean.png", root)).size > 0)
  assert.equal(readFileSync(asset).toString("ascii", 8, 12), "WEBP")
})

test("versioned cinematic frames and brand assets avoid repeat-visit revalidation", () => {
  for (const path of ["/animated/neural-cortex-v1/*", "/animated/inner-system-v1/*", "/brand/ax-wordmark-512-v1.webp"]) {
    assert.ok(headers.includes(`${path}\n  Cache-Control: public, max-age=31536000, immutable`), path)
  }
  assert.ok(!headers.includes("/api/*\n  Cache-Control"), "Never cache private APIs indiscriminately")
})
