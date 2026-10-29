import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import test from "node:test"
import vm from "node:vm"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

const require = createRequire(import.meta.url)
const { LazyMotion, domAnimation } = require("motion/react")
const root = new URL("../../../", import.meta.url)
const read = path => readFileSync(new URL(path, root), "utf8")

test("the homepage Motion provider renders server children immediately without a loading boundary", () => {
  const source = read("components/providers/HomeMotionProvider.tsx")
  const context = vm.createContext({ exports: {}, require })
  vm.runInContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context)
  const child = createElement("main", { id: "server-copy" }, "Existing server content")
  const output = context.exports.HomeMotionProvider({ children: child })
  assert.equal(output.type, LazyMotion)
  assert.equal(output.props.features, domAnimation)
  assert.equal(output.props.children, child)
  assert.equal(renderToStaticMarkup(output), '<main id="server-copy">Existing server content</main>')
  assert.doesNotMatch(source, /useState|useEffect|Suspense|ssr: false/)
})

test("only the homepage imports the Motion provider; cinema, legal and root layout do not", () => {
  const layout = read("app/layout.tsx")
  assert.doesNotMatch(layout, /motion\/react|LazyMotion|HomeMotionProvider/)
  const home = read("app/page.tsx")
  assert.match(home, /import \{ HomeMotionProvider \}/)
  assert.match(home, /<HomeMotionProvider><main/)
  assert.match(home, /<BookingSection \/>/)
  assert.match(home, /<BookingDialog \/>/)
  assert.match(home, /<\/main><\/HomeMotionProvider>/)
  assert.doesNotMatch(home, /^['"]use client['"]/)
  for (const path of ["app/animated/page.tsx", "app/systems/qualified-pipeline/page.tsx", "app/privacy-policy/page.tsx", "app/legal/page.tsx", "app/cookies/page.tsx"]) {
    assert.doesNotMatch(read(path), /HomeMotionProvider|motion\/react/, path)
  }
  assert.match(read("app/systems/qualified-pipeline/page.tsx"), /const bookingHref = "\/\?intent=qualified-pipeline#booking"/)
})

test("cinema header links do not prefetch the homepage's interactive feature chunks", () => {
  const cinema = read("components/animated-cinema/cinematic-experience.tsx")
  const homeLinks = [...cinema.matchAll(/<Link href="\/"[^>]*>/g)]
  assert.equal(homeLinks.length, 2)
  for (const [link] of homeLinks) assert.match(link, /prefetch=\{false\}/)
})
