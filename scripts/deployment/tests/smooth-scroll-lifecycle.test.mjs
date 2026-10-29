import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"
import ts from "typescript"

const read = file => readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8")
const settle = () => new Promise(resolve => setImmediate(resolve))
const plain = value => JSON.parse(JSON.stringify(value))

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

/** Actual production modules, with no browser, network or Lenis/Motion imports. */
function fixture({ pathname = "/", reduced = false, fine = true, pending = false } = {}) {
  const queries = new Map(), effects = [], imports = [], instances = [], frames = new Map()
  const nativeScrolls = [], cancellations = [], modules = new Map()
  let route = pathname, top = 100
  const element = { getBoundingClientRect: () => ({ top }), scrollIntoView: options => nativeScrolls.push(options) }
  const query = name => {
    if (!queries.has(name)) queries.set(name, {
      matches: name.includes("reduced-motion") ? reduced : fine,
      listeners: new Set(),
      addEventListener(_name, listener) { this.listeners.add(listener) },
      removeEventListener(_name, listener) { this.listeners.delete(listener) },
      change(value) { this.matches = value; for (const listener of this.listeners) listener() },
    })
    return queries.get(name)
  }
  class Lenis {
    constructor(options) { this.options = options; this.scrolls = []; this.times = []; this.destroyed = 0; instances.push(this) }
    scrollTo(target, options) { this.scrolls.push({ target, options }) }
    raf(timestamp) { this.times.push(timestamp) }
    destroy() { this.destroyed++ }
  }
  const lenisModule = { default: Lenis }
  const motionModule = {
    frame: { update: (callback, keepAlive) => frames.set(callback, keepAlive) },
    cancelFrame: callback => { frames.delete(callback); cancellations.push(callback) },
  }
  const lenisImport = deferred(), motionImport = deferred()
  function load(file) {
    const context = vm.createContext({
      exports: {},
      window: { matchMedia: query },
      document: { querySelector: selector => selector === "#target" ? element : null },
      require(name) {
        if (name === "react") return { useEffect: callback => effects.push(callback) }
        if (name === "next/navigation") return { usePathname: () => route }
        if (name === "./scroll-bridge") return modules.get("bridge")
        if (name === "lenis") { imports.push(name); return pending ? lenisImport.promise : lenisModule }
        if (name === "./scroll-clock") { imports.push(name); return pending ? motionImport.promise : motionModule }
        throw new Error(`Unexpected dependency ${name}`)
      },
    })
    vm.runInContext(ts.transpileModule(read(file), { compilerOptions: {
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
    } }).outputText, context)
    return context.exports
  }
  const bridge = load("components/providers/scroll-bridge.ts")
  modules.set("bridge", bridge)
  const provider = load("components/providers/SmoothScroll.tsx")
  return {
    bridge, query, element, nativeScrolls, imports, instances, frames, cancellations, lenisImport, motionImport,
    mount(path = route) { route = path; provider.SmoothScroll(); return effects.pop()() },
    resolveLenis() { lenisImport.resolve(lenisModule) },
    resolveMotion() { motionImport.resolve(motionModule) },
    resolveImports() { lenisImport.resolve(lenisModule); motionImport.resolve(motionModule) },
    setTop(value) { top = value },
  }
}

test("animated, coarse-pointer and reduced-motion routes never import optional runtimes", async () => {
  for (const options of [{ pathname: "/animated" }, { fine: false }, { reduced: true }]) {
    const f = fixture(options), cleanup = f.mount()
    await settle()
    assert.deepEqual(f.imports, [])
    assert.equal(f.instances.length, 0)
    f.bridge.lenisScrollTo("#target")
    assert.equal(f.nativeScrolls.length, 1)
    assert.equal(f.nativeScrolls[0].behavior, options.reduced ? "auto" : "smooth")
    cleanup?.()
    for (const name of ["(prefers-reduced-motion: reduce)", "(hover: hover) and (pointer: fine)"]) assert.equal(f.query(name).listeners.size, 0)
  }
})

test("eligible desktop imports both libraries in parallel and keeps authored physics and Motion clock", async () => {
  const f = fixture({ pending: true }), cleanup = f.mount()
  f.bridge.lenisScrollTo("#target")
  assert.equal(f.nativeScrolls.length, 1, "Native fallback must work while chunks are pending")
  await settle()
  assert.deepEqual(f.imports, ["lenis", "./scroll-clock"])
  f.resolveLenis()
  await settle()
  assert.equal(f.instances.length, 0, "Do not start before both libraries are available")
  f.resolveMotion()
  await settle()
  assert.deepEqual(plain(f.instances[0].options), { smoothWheel: true, syncTouch: false, lerp: 0.14 })
  assert.equal(f.frames.size, 1)
  const [[update, keepAlive]] = f.frames
  assert.equal(keepAlive, true)
  update({ timestamp: 42 })
  assert.deepEqual(f.instances[0].times, [42])
  cleanup()
  assert.equal(f.frames.size, 0)
  assert.equal(f.instances[0].destroyed, 1)
  assert.equal(f.cancellations.length, 1)
})

test("navigation and Strict Mode cleanup invalidate pending import completions", async () => {
  for (const nextRoute of ["/animated", "/"]) {
    const f = fixture({ pending: true }), cleanup = f.mount()
    await settle()
    cleanup()
    const nextCleanup = f.mount(nextRoute)
    f.resolveImports()
    await settle()
    assert.equal(f.instances.length, nextRoute === "/" ? 1 : 0)
    assert.equal(f.frames.size, nextRoute === "/" ? 1 : 0)
    nextCleanup?.()
    assert.equal(f.frames.size, 0)
    assert.ok(f.instances.every(instance => instance.destroyed === 1))
  }
})

test("preference changes invalidate pending imports, stop active work and resume only when eligible", async () => {
  const f = fixture({ pending: true }), cleanup = f.mount()
  await settle()
  const reduced = f.query("(prefers-reduced-motion: reduce)")
  const fine = f.query("(hover: hover) and (pointer: fine)")
  reduced.change(true)
  f.resolveImports()
  await settle()
  assert.equal(f.instances.length, 0)
  reduced.change(false)
  await settle()
  assert.equal(f.instances.length, 1)
  fine.change(false)
  assert.equal(f.frames.size, 0)
  assert.equal(f.instances[0].destroyed, 1)
  fine.change(true)
  await settle()
  assert.equal(f.instances.length, 2)
  reduced.change(true)
  assert.equal(f.frames.size, 0)
  assert.equal(f.instances[1].destroyed, 1)
  f.bridge.lenisScrollTo(f.element)
  assert.equal(f.nativeScrolls.at(-1).behavior, "auto")
  cleanup()
  assert.equal(reduced.listeners.size, 0)
  assert.equal(fine.listeners.size, 0)
})

test("rejected optional imports keep native anchors available without leaking a rejection", async () => {
  const f = fixture({ pending: true }), cleanup = f.mount()
  await settle()
  f.lenisImport.reject(new Error("synthetic chunk failure"))
  f.motionImport.resolve({})
  await settle()
  f.bridge.lenisScrollTo("#missing")
  f.bridge.lenisScrollTo(f.element)
  assert.equal(f.nativeScrolls.length, 1)
  assert.equal(f.nativeScrolls[0].behavior, "smooth")
  assert.equal(f.instances.length, 0)
  assert.equal(f.frames.size, 0)
  cleanup()
})

test("anchor correction preserves timing/offset and cannot act on a replaced or reduced-motion instance", () => {
  const f = fixture(), calls = [], newerCalls = []
  const unregister = f.bridge.registerScrollInstance({ scrollTo: (target, options) => calls.push({ target, options }) })
  f.bridge.lenisScrollTo("#target")
  assert.equal(calls[0].options.offset, -80)
  assert.equal(calls[0].options.duration, 0.85)
  assert.equal(calls[0].options.easing(0.5), 0.875)
  calls[0].options.onComplete()
  assert.equal(calls[1].target, f.element)
  assert.equal(calls[1].options.duration, 0.18)
  assert.equal(calls[1].options.offset, -80)
  f.setTop(82)
  calls[0].options.onComplete()
  assert.equal(calls.length, 2, "At most two pixels of drift must not trigger another glide")
  const unregisterNewer = f.bridge.registerScrollInstance({ scrollTo: (...args) => newerCalls.push(args) })
  unregister()
  f.setTop(100)
  calls[0].options.onComplete()
  assert.equal(newerCalls.length, 0, "A stale completion must not use the new route's instance")
  f.bridge.lenisScrollTo("#target")
  assert.equal(newerCalls.length, 1, "Old cleanup must not unregister the current instance")
  f.query("(prefers-reduced-motion: reduce)").matches = true
  newerCalls[0][1].onComplete()
  f.bridge.lenisScrollTo("#target")
  assert.equal(newerCalls.length, 1)
  assert.equal(f.nativeScrolls.at(-1).behavior, "auto")
  unregisterNewer()
})

test("navigation imports only the lightweight bridge, without eager Lenis or Motion dependencies", () => {
  assert.match(read("components/home/actions.ts"), /providers\/scroll-bridge/)
  assert.doesNotMatch(read("components/home/actions.ts"), /providers\/SmoothScroll/)
  for (const file of ["components/providers/SmoothScroll.tsx", "components/providers/scroll-bridge.ts"]) {
    const ast = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true)
    const eager = ast.statements.filter(ts.isImportDeclaration).map(node => node.moduleSpecifier.text)
    assert.ok(!eager.includes("lenis") && !eager.includes("motion/react"))
  }
  const clock = ts.createSourceFile("scroll-clock.ts", read("components/providers/scroll-clock.ts"), ts.ScriptTarget.Latest, true)
  const exports = clock.statements.filter(ts.isExportDeclaration)
  assert.equal(exports.length, 1)
  assert.equal(exports[0].moduleSpecifier.text, "motion/react")
  assert.deepEqual(exports[0].exportClause.elements.map(node => node.name.text), ["frame", "cancelFrame"])
})
