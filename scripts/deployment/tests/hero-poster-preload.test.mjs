import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import test from "node:test"
import vm from "node:vm"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8")
const hintSource = read("components/home/hero-poster-hints.tsx")
const executable = ts.transpileModule(hintSource, { compilerOptions: {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.ReactJSX,
} }).outputText
const context = vm.createContext({ exports: {}, require })
vm.runInContext(executable, context)
const hints = context.exports.HeroPosterHints()
const links = React.Children.toArray(hints.props.children)

test("homepage robot art-direction hints are server-rendered into the document head", () => {
  assert.doesNotMatch(hintSource, /["']use client["']|useEffect|useState|window|document\./)
  assert.equal(links.length, 3)
  for (const link of links) {
    assert.equal(link.type, "link")
    assert.equal(link.props.rel, "preload")
    assert.equal(link.props.as, "image")
    assert.equal(link.props.type, "image/webp")
    assert.equal(link.props.fetchPriority, "high")
    assert.ok(readFileSync(new URL(`../../../public${link.props.href}`, import.meta.url)).byteLength < 25_000)
  }
  const html = renderToStaticMarkup(React.createElement("html", null,
    React.createElement("head"),
    React.createElement("body", null, React.createElement("main", null, hints, "Homepage")),
  ))
  const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1]
  assert.ok(head)
  for (const link of links) assert.ok(head.includes(link.props.href))
  assert.equal((head.match(/rel="preload"/g) ?? []).length, 3)
  assert.doesNotMatch(html.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? "", /rel="preload"/)
})

// These are the exact intentionally simple predicates in the shipped markup,
// not an invented general-purpose CSS media evaluator.
const matches = (media, width) => {
  if (media === "(max-width: 520px)") return width <= 520
  if (media === "(width > 520px) and (width <= 1023px)") return width > 520 && width <= 1023
  if (media === "(width > 1023px)") return width > 1023
  assert.fail(`Unexpected media predicate: ${media}`)
}

test("one matching preload equals the existing picture source at every viewport boundary", () => {
  const visual = read("components/home/hero-islands.tsx")
  assert.match(visual, /<source media="\(max-width: 520px\)" srcSet="\/hero\/robot-poster-mobile\.webp"/)
  assert.match(visual, /<source media="\(max-width: 1023px\)" srcSet="\/hero\/robot-poster-tablet\.webp"/)
  assert.match(visual, /src="\/hero\/robot-poster-desktop\.webp"/)
  assert.match(visual, /loading="eager"/)
  assert.match(visual, /fetchPriority="high"/)
  for (const width of [320, 360, 390, 520, 520.01, 520.5, 521, 768, 1023, 1023.01, 1023.5, 1024, 1280, 1440, 2560]) {
    const selected = links.filter(link => matches(link.props.media, width))
    assert.equal(selected.length, 1, `${width}: no duplicate or missing art-direction hint`)
    const expected = width <= 520 ? "mobile" : width <= 1023 ? "tablet" : "desktop"
    assert.equal(selected[0].props.href, `/hero/robot-poster-${expected}.webp`)
  }
})

test("robot hints stay homepage-scoped and never preload WebGL or animated media", () => {
  assert.match(read("app/page.tsx"), /import \{ HeroPosterHints \} from "@\/components\/home\/hero-poster-hints"/)
  assert.match(read("app/page.tsx"), /<HeroPosterHints \/>/)
  assert.doesNotMatch(read("app/layout.tsx"), /HeroPosterHints|robot-poster-(mobile|tablet|desktop)/)
  assert.doesNotMatch(read("app/animated/page.tsx"), /HeroPosterHints|hero-poster-hints|robot-poster-/)
  assert.doesNotMatch(hintSource, /splinecode|wasm|\.mp4|\.webm|\/animated\//)
})
