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
const configContext = vm.createContext({ exports: {} })
const transpile = code => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
vm.runInContext(transpile(read("components/animated-cinema/config.ts")), configContext)
const context = vm.createContext({ exports: {}, require: name => name === "./config" ? configContext.exports : require(name) })
const source = read("components/animated-cinema/cinematic-poster-hints.tsx")
vm.runInContext(transpile(source), context)
const hints = context.exports.CinematicPosterHints()
const links = React.Children.toArray(hints.props.children)

test("cinematic poster hints use the exact existing art-directed stills, with no frame preloading", () => {
  assert.doesNotMatch(source, /["']use client["']|useEffect|window|fetch\(/)
  assert.equal(links.length, 2)
  const root = configContext.exports.CINEMA.root
  assert.deepEqual(links.map(link => link.props.href), [`${root}/entity-mobile.webp`, `${root}/entity.webp`])
  assert.deepEqual(links.map(link => link.props.media), ["(max-width: 767px)", "(width > 767px)"])
  for (const link of links) {
    assert.equal(link.props.rel, "preload")
    assert.equal(link.props.as, "image")
    assert.equal(link.props.type, "image/webp")
    assert.equal(link.props.fetchPriority, "high")
  }
  const html = renderToStaticMarkup(React.createElement("html", null, React.createElement("head"), React.createElement("body", null, hints)))
  const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1]
  assert.ok(head)
  for (const link of links) assert.ok(head.includes(link.props.href))
  assert.equal((head.match(/rel="preload"/g) ?? []).length, 2)
  assert.doesNotMatch(html, /frames\/|\.mp4|\.webm|splinecode|wasm/)
  const ui = read("components/animated-cinema/cinematic-experience.tsx")
  assert.match(ui, /<source media="\(max-width: 767px\)" srcSet=\{`\$\{CINEMA.root\}\/\$\{poster.name\}-mobile.webp`\}/)
  assert.doesNotMatch(read("app/page.tsx"), /CinematicPosterHints|cinematic-poster-hints/)
  assert.doesNotMatch(read("app/layout.tsx"), /CinematicPosterHints|cinematic-poster-hints/)
})
