import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"
import ts from "typescript"

const source = readFileSync(new URL("../../../components/home/lazy-islands.tsx", import.meta.url), "utf8")
const parsed = ts.createSourceFile("lazy-islands.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const component = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === "DeferredIsland")
assert.ok(component, "Test the actual viewport gate, not a duplicated implementation")

function fixture(supported = true) {
  const effects = [], states = [], observations = [], disconnects = []
  let handler, options
  const element = {}
  const context = vm.createContext({
    React: { createElement: (tag, props, ...children) => ({ tag, props, children }) },
    useRef: () => ({ current: element }),
    useState: () => [false, value => states.push(value)],
    useEffect: callback => effects.push(callback),
    queueMicrotask: callback => callback(),
    window: supported ? { IntersectionObserver: true } : {},
    IntersectionObserver: class {
      constructor(callback, configuration) { handler = callback; options = configuration }
      observe(value) { observations.push(value) }
      disconnect() { disconnects.push(true) }
    },
  })
  const executable = ts.transpileModule(component.getText(parsed), { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } }).outputText
  vm.runInContext(`${executable}\nglobalThis.run = DeferredIsland`, context)
  const output = context.run({ children: "heavy-widget", fallback: "reserved-placeholder" })
  const cleanup = effects[0]()
  return { output, states, observations, disconnects, element, handler, options, cleanup }
}

test("below-fold chunks wait for actual viewport proximity and keep their placeholder before it", () => {
  const f = fixture()
  assert.equal(f.output.children[0], "reserved-placeholder")
  assert.equal(f.options.rootMargin, "320px")
  assert.equal(f.observations[0], f.element)
  f.handler([{ isIntersecting: false }])
  assert.deepEqual(f.states, [])
  f.handler([{ isIntersecting: true }])
  assert.deepEqual(f.states, [true])
  assert.equal(f.disconnects.length, 1)
  f.cleanup()
  assert.equal(f.disconnects.length, 2)
})

test("widget content remains available without IntersectionObserver support", () => {
  const f = fixture(false)
  assert.deepEqual(f.states, [true])
  assert.equal(f.observations.length, 0)
})
