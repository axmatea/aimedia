import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"
import ts from "typescript"

// Execute production components with a small browser/React harness. No Spline
// runtime, WebGL driver, network, analytics, booking or provider is contacted.
function browserHarness(componentFile, { saveData = false, stateOverrides = {} } = {}) {
  const effects = [], callbacks = [], frames = new Map(), timers = new Map()
  const stateUpdates = [], renderedTags = []
  const observers = [], documentListeners = new Map(), windowListeners = new Map()
  const canvas = { clientWidth: 1200, clientHeight: 900, style: {}, dispatchEvent() {} }
  const deletions = { buffer: 0, program: 0, shader: 0 }
  const gl = new Proxy({}, { get(_target, name) {
    if (name === "getShaderParameter" || name === "getProgramParameter") return () => true
    if (name === "createShader" || name === "createProgram" || name === "createBuffer") return () => ({})
    if (name === "deleteShader") return () => deletions.shader++
    if (name === "deleteProgram") return () => deletions.program++
    if (name === "deleteBuffer") return () => deletions.buffer++
    return () => {}
  } })
  canvas.getContext = () => gl
  const queries = new Map()
  const query = value => {
    if (!queries.has(value)) queries.set(value, {
      matches: value.includes("pointer: fine"),
      listeners: new Set(),
      addEventListener(_name, callback) { this.listeners.add(callback) },
      removeEventListener(_name, callback) { this.listeners.delete(callback) },
    })
    return queries.get(value)
  }
  const document = {
    hidden: false,
    createElement: () => canvas,
    addEventListener: (name, callback) => documentListeners.set(name, callback),
    removeEventListener: name => documentListeners.delete(name),
  }
  const connection = {
    saveData,
    listeners: new Set(),
    addEventListener(_name, callback) { this.listeners.add(callback) },
    removeEventListener(_name, callback) { this.listeners.delete(callback) },
    change(value) { this.saveData = value; for (const callback of this.listeners) callback() },
  }
  let serial = 0
  const window = {
    innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1,
    matchMedia: query,
    addEventListener: (name, callback) => windowListeners.set(name, callback),
    removeEventListener: name => windowListeners.delete(name),
    setTimeout: callback => { timers.set(++serial, callback); return serial },
    clearTimeout: id => timers.delete(id),
  }
  const lazyComponent = () => null
  let stateIndex = 0
  const react = {
    useRef: initial => ({ current: initial }),
    useState: initial => {
      const index = stateIndex++
      return [index in stateOverrides ? stateOverrides[index] : initial, value => stateUpdates.push({ index, value })]
    },
    useEffect: effect => effects.push(effect),
    useCallback: callback => { callbacks.push(callback); return callback },
    lazy: () => lazyComponent,
    Suspense: () => null,
  }
  const jsx = (tag, props) => {
    renderedTags.push(tag)
    if (props.ref) props.ref.current = canvas
    return null
  }
  const jsxRuntime = { jsx, jsxs: jsx }
  const context = vm.createContext({
    exports: {}, document, window, console, navigator: { connection },
    requestAnimationFrame: callback => { frames.set(++serial, callback); return serial },
    cancelAnimationFrame: id => frames.delete(id),
    ResizeObserver: class { observe() {} disconnect() {} },
    IntersectionObserver: class {
      constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this) }
      observe() {}
      disconnect() {}
      enter(isIntersecting) { this.callback([{ isIntersecting }]) }
    },
    MouseEvent: class {},
    require(name) {
      if (name === "react") return react
      if (name === "react/jsx-runtime") return jsxRuntime
      throw new Error(`Unexpected dependency: ${name}`)
    },
  })
  const source = readFileSync(new URL(`../../../${componentFile}`, import.meta.url), "utf8")
  const executable = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  vm.runInContext(executable, context)
  function flushFrames(limit = 300) {
    let count = 0
    while (frames.size && count < limit) {
      const batch = [...frames.entries()]
      frames.clear()
      for (const [, callback] of batch) callback(++count * 16)
    }
    return count
  }
  return { ...context, effects, callbacks, frames, timers, observers, deletions, query, documentListeners, windowListeners, flushFrames, connection, stateUpdates, renderedTags, lazyComponent }
}

test("Lightning starts only in view and pauses for hidden tabs and reduced motion, releasing GPU resources", () => {
  const harness = browserHarness("components/ui/lightning.tsx")
  harness.exports.Lightning({})
  const cleanup = harness.effects[0]()
  assert.equal(harness.frames.size, 0, "Must wait for actual intersection")
  harness.observers[0].enter(true)
  assert.equal(harness.frames.size, 1)
  harness.document.hidden = true
  harness.documentListeners.get("visibilitychange")()
  assert.equal(harness.frames.size, 0)
  harness.observers[0].enter(false)
  harness.document.hidden = false
  harness.documentListeners.get("visibilitychange")()
  assert.equal(harness.frames.size, 0, "Returning to tab must not restart an offscreen canvas")
  harness.observers[0].enter(true)
  const reduced = harness.query("(prefers-reduced-motion: reduce)")
  reduced.matches = true
  for (const listener of reduced.listeners) listener()
  assert.equal(harness.frames.size, 0)
  reduced.matches = false
  for (const listener of reduced.listeners) listener()
  assert.equal(harness.frames.size, 1)
  cleanup()
  assert.equal(harness.frames.size, 0)
  assert.deepEqual(harness.deletions, { buffer: 1, program: 1, shader: 2 })
  assert.equal(harness.documentListeners.size, 0)
  assert.equal(reduced.listeners.size, 0)
})

function splineFixture(hasHead = true, props = {}) {
  const harness = browserHarness("components/ui/splite.tsx")
  harness.exports.SplineScene({ scene: "/spline/robot.splinecode", ...props })
  const cleanups = harness.effects.map(effect => effect())
  const near = harness.observers.find(observer => observer.options.rootMargin)
  const visible = harness.observers.find(observer => !observer.options.rootMargin)
  near.enter(true)
  visible.enter(true)
  const head = { name: "Head", rotation: { x: 0, y: 0, z: 0 } }
  const calls = { play: 0, stop: 0 }
  const app = {
    getAllObjects: () => hasHead ? [head] : [],
    play: () => calls.play++, stop: () => calls.stop++,
  }
  harness.callbacks[0](app)
  harness.flushFrames() // Two authored-pose reveal frames, not a perpetual loop.
  assert.equal(harness.frames.size, 0)
  return { ...harness, calls, head, visible, cleanups }
}

test("Spline tab resume requires real viewport intersection and does not restart settled head work", () => {
  const harness = splineFixture()
  harness.visible.enter(false)
  const playCount = harness.calls.play
  harness.document.hidden = true
  harness.documentListeners.get("visibilitychange")()
  harness.document.hidden = false
  harness.documentListeners.get("visibilitychange")()
  assert.equal(harness.calls.play, playCount)
  assert.equal(harness.frames.size, 0)
  harness.visible.enter(true)
  assert.equal(harness.calls.play, playCount + 1, "Authored idle animation resumes in view")
  assert.equal(harness.frames.size, 0, "A settled head needs no extra animation loop")
  for (const cleanup of harness.cleanups) cleanup?.()
})

test("Spline pointer lerp runs only for a real head and stops at its target", () => {
  const harness = splineFixture()
  harness.windowListeners.get("mousemove")({ clientX: 1400, clientY: 100 })
  assert.equal(harness.frames.size, 1)
  const count = harness.flushFrames()
  assert.ok(count > 1 && count < 100, `Expected a finite smooth response, got ${count}`)
  assert.equal(harness.frames.size, 0)
  assert.ok(harness.head.rotation.y > 0)
  for (const cleanup of harness.cleanups) cleanup?.()
  const headless = splineFixture(false)
  headless.windowListeners.get("mousemove")({ clientX: 1400, clientY: 100 })
  assert.equal(headless.frames.size, 0, "Never spin a lerp loop without a head object")
  for (const cleanup of headless.cleanups) cleanup?.()
})

test("Save-Data disables the live runtime gate without changing the default live robot", () => {
  const fallback = browserHarness("components/ui/splite.tsx", {
    saveData: true,
    stateOverrides: { 1: false, 2: true, 3: true, 4: true },
  })
  const readiness = []
  fallback.exports.SplineScene({ scene: "/spline/robot.splinecode", onReadyChange: value => readiness.push(value) })
  const cleanup = fallback.effects[0]()
  assert.deepEqual(readiness, [false], "The approved poster must remain visible")
  assert.deepEqual(fallback.stateUpdates.find(update => update.index === 1), { index: 1, value: false })
  assert.ok(!fallback.renderedTags.includes(fallback.lazyComponent), "No lazy Spline/runtime import while Save-Data is enabled")
  fallback.connection.change(false)
  assert.deepEqual(fallback.stateUpdates.filter(update => update.index === 1).at(-1), { index: 1, value: true })
  cleanup()
  assert.equal(fallback.connection.listeners.size, 0)

  const normal = browserHarness("components/ui/splite.tsx", {
    stateOverrides: { 1: true, 2: true, 3: true, 4: true },
  })
  normal.exports.SplineScene({ scene: "/spline/robot.splinecode" })
  assert.ok(normal.renderedTags.includes(normal.lazyComponent), "Default first-load animation remains enabled")
})

test("live Save-Data and reduced-motion changes cancel work and restore the poster before re-entry", () => {
  const readiness = []
  const harness = splineFixture(true, { onReadyChange: value => readiness.push(value) })
  assert.deepEqual(readiness, [], "Readiness must wait for the authored pre-roll")
  for (const [id, callback] of [...harness.timers]) { harness.timers.delete(id); callback() }
  assert.deepEqual(readiness, [true])
  harness.windowListeners.get("mousemove")({ clientX: 1400, clientY: 100 })
  assert.equal(harness.frames.size, 1)
  const stops = harness.calls.stop
  harness.connection.change(true)
  assert.equal(harness.calls.stop, stops + 1)
  assert.equal(harness.frames.size, 0)
  assert.equal(harness.timers.size, 0)
  assert.equal(harness.windowListeners.has("mousemove"), false)
  assert.deepEqual(readiness, [true, false])

  let staleStopped = 0
  harness.callbacks[0]({ stop: () => staleStopped++ })
  assert.equal(staleStopped, 1, "A late response must not restart a stale renderer")
  assert.equal(harness.frames.size, 0)
  harness.connection.change(false)
  assert.deepEqual(harness.stateUpdates.filter(update => update.index === 1).at(-1), { index: 1, value: true })
  assert.deepEqual(readiness, [true, false], "The poster stays visible until the next pre-roll completes")

  const reduced = harness.query("(prefers-reduced-motion: reduce)")
  reduced.matches = true
  for (const listener of reduced.listeners) listener()
  assert.equal(readiness.at(-1), false)
  for (const cleanup of harness.cleanups) cleanup?.()
  assert.equal(harness.connection.listeners.size, 0)
  harness.callbacks[0]({ stop: () => staleStopped++ })
  assert.equal(staleStopped, 2, "Unmount also rejects late callbacks")
})

test("hero never mounts Lightning for the light theme, a small screen or reduced motion", () => {
  const source = readFileSync(new URL("../../../components/home/hero-islands.tsx", import.meta.url), "utf8")
  const parsed = ts.createSourceFile("hero-islands.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let condition
  function visit(node) {
    if (ts.isJsxExpression(node) && node.expression?.getText(parsed).includes("<Lightning")) condition = node.expression
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  assert.ok(condition && ts.isBinaryExpression(condition))
  const gate = condition.left.getText(parsed)
  for (const desktop of [false, true]) for (const resolvedTheme of [undefined, "light", "dark"]) for (const reducedMotion of [false, true]) {
    const allowed = vm.runInNewContext(gate, { desktop, resolvedTheme, reducedMotion })
    assert.equal(Boolean(allowed), desktop && resolvedTheme === "dark" && !reducedMotion)
  }
})
