import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"
import ts from "typescript"

const base = new URL("../../../components/animated-cinema/", import.meta.url)
const source = name => readFileSync(new URL(name, base), "utf8")
function module(name) {
  const context = vm.createContext({ exports: {}, AbortController, Blob })
  const js = ts.transpileModule(source(name), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInContext(js, context)
  return context.exports
}
const { CinemaFrameCache } = module("frame-cache.ts")
const timeline = module("timeline.ts")
const { CINEMA } = module("config.ts")
const settle = async predicate => {
  for (let attempt = 0; attempt < 300; attempt++) {
    if (predicate()) return
    await new Promise(resolve => setImmediate(resolve))
  }
  assert.fail("Frame cache did not settle")
}

test("single film timeline has exact endpoints and continuous reversible framing", () => {
  assert.equal(timeline.frameAt(0, CINEMA.frameCount, CINEMA.filmEnd), 0)
  assert.equal(timeline.frameAt(1, CINEMA.frameCount, CINEMA.filmEnd), CINEMA.frameCount - 1)
  assert.equal(timeline.frameUrl(CINEMA.root, 7, true), `${CINEMA.root}/frames/mobile/0007.webp`)
  for (const [start, target] of [[0, 1], [1, 0], [.1, .9], [.75, .2]]) {
    let current = start
    for (let i = 0; i < 120; i++) {
      const next = timeline.follow(current, target, 1 / 60)
      assert.ok(next >= Math.min(current, target) && next <= Math.max(current, target))
      current = next
    }
    assert.ok(Math.abs(current - target) < .00001)
  }
  for (const [width, height] of [[1440, 900], [1280, 800], [768, 1024], [390, 844], [360, 800], [970, 1034], [840, 1034]]) {
    let previous = null
    // Portrait cover grows a 16:9 world beyond the viewport. Sample below one
    // native scroll pixel, so continuity is tested without imposing contain-only speed.
    for (let step = 0; step <= 10000; step++) {
      const progress = step / 10000
      const framing = timeline.framingAt(progress, width / height < .95 ? CINEMA.framing.portrait : CINEMA.framing.desktop)
      const rect = timeline.filmRect(width, height, 16 / 9, framing)
      assert.ok(Math.abs(rect.width / rect.height - 16 / 9) < .000001)
      if (framing.immersion === 0) assert.ok(rect.y >= 0 && rect.y + rect.height <= height, "Full-entity phases preserve the complete source height")
      if (previous) assert.ok(Math.abs(rect.width - previous.width) < width * .0075, "Camera must not snap")
      previous = rect
    }
  }
})

test("optional cinematic immersion preserves safe geometry at zero and centered cover at one", () => {
  const aspects = [16 / 9, 4 / 3, 1]
  for (const [width, height] of [[1440, 900], [1280, 800], [768, 1024], [390, 844], [360, 800], [970, 1034]]) {
    for (const sourceAspect of aspects) {
      const framing = { scale: 1.35, centerX: .44, centerY: .48 }
      const legacyWidth = Math.min(Math.min(width, height * sourceAspect) * framing.scale, height * sourceAspect * .94)
      const legacy = { x: width * framing.centerX - legacyWidth / 2, y: height * framing.centerY - legacyWidth / sourceAspect / 2, width: legacyWidth, height: legacyWidth / sourceAspect }
      assert.deepEqual({ ...timeline.filmRect(width, height, sourceAspect, framing) }, legacy)
      assert.deepEqual({ ...timeline.filmRect(width, height, sourceAspect, { ...framing, immersion: 0 }) }, legacy)
      const cover = timeline.filmRect(width, height, sourceAspect, { ...framing, immersion: 1 })
      assert.ok(cover.width >= width - .000001 && cover.height >= height - .000001)
      assert.ok(Math.abs(cover.x + cover.width / 2 - width / 2) < .000001)
      assert.ok(Math.abs(cover.y + cover.height / 2 - height / 2) < .000001)
      for (let step = 0; step <= 100; step++) {
        const immersion = step / 100
        const rect = timeline.filmRect(width, height, sourceAspect, { ...framing, immersion })
        assert.ok(Math.abs(rect.width / rect.height - sourceAspect) < .000001, "Film is cropped, never stretched")
        assert.ok(rect.width >= Math.min(legacy.width, cover.width) && rect.width <= Math.max(legacy.width, cover.width))
        assert.ok(Math.abs(rect.width - (legacy.width + (cover.width - legacy.width) * immersion)) < .000001)
      }
    }
  }
})

test("immersion keyframes interpolate continuously and reversibly through entry and return", () => {
  const keys = [
    { at: 0, scale: 2.2, centerX: .5, centerY: .48 },
    { at: .2, scale: 2.2, centerX: .5, centerY: .48, immersion: 0 },
    { at: .4, scale: 1.35, centerX: .5, centerY: .48, immersion: 1 },
    { at: .7, scale: 1.35, centerX: .5, centerY: .48, immersion: 1 },
    { at: 1, scale: 2.2, centerX: .5, centerY: .48 },
  ]
  assert.equal(timeline.framingAt(-1, keys).immersion, 0)
  assert.equal(timeline.framingAt(2, keys).immersion, 0)
  assert.equal(timeline.framingAt(.4, keys).immersion, 1)
  assert.equal(timeline.framingAt(.7, keys).immersion, 1)
  const forward = []
  for (let step = 0; step <= 1000; step++) {
    const framing = timeline.framingAt(step / 1000, keys)
    assert.ok(framing.immersion >= 0 && framing.immersion <= 1)
    const rect = timeline.filmRect(390, 844, 16 / 9, framing)
    if (forward.length) assert.ok(Math.abs(rect.width - forward.at(-1).width) < 8, "Immersion may not snap between safe and cover rects")
    forward.push(rect)
  }
  for (let step = 1000; step >= 0; step--) assert.deepEqual(timeline.filmRect(390, 844, 16 / 9, timeline.framingAt(step / 1000, keys)), forward[step])
  const ui = source("cinematic-experience.tsx")
  assert.match(ui, /immersion: preference\.matches \|\| fallback \? 0 : framing\.immersion/)
})

test("reduced-motion still crossfades preserve one complete visual without frame downloads", () => {
  for (let step = 0; step <= 1000; step++) {
    const weights = timeline.posterWeights(step / 1000, [0, .59, .87])
    assert.ok(weights.every(weight => weight >= 0 && weight <= 1))
    assert.ok(Math.abs(weights.reduce((a, b) => a + b, 0) - 1) < .000001)
  }
  const ui = source("cinematic-experience.tsx")
  assert.match(ui, /if \(preference\.matches \|\| fallback\) return/)
  assert.match(ui, /preference\.addEventListener\("change"/)
  assert.doesNotMatch(ui, /<video|currentTime\s*=|WebGL|setInterval|setTimeout/)
  assert.match(ui, /if \(ready\) \{ presented = interpolated; pendingProposal = null; paintLayers\(presented\) \}/)
  assert.match(ui, /addEventListener\("scroll", readScroll, \{ passive: true \}\)/)
  assert.doesNotMatch(ui, /preventDefault/)
})

test("frame cache activation waits for intent or restored progress and stays disposed", () => {
  const ui = source("cinematic-experience.tsx")
  const parsed = ts.createSourceFile("cinematic-experience.tsx", ui, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let implementation
  function visit(node) {
    if (ts.isClassDeclaration(node) && node.name?.text === "CinemaFrameActivation") implementation = node.getText(parsed)
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  assert.ok(implementation, "Test must execute the production activation gate")
  const gateContext = vm.createContext({ exports: {}, Number })
  vm.runInContext(ts.transpileModule(`export ${implementation}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText, gateContext)
  const Gate = gateContext.exports.CinemaFrameActivation
  const gate = new Gate()
  let starts = 0
  const start = () => { starts++ }
  assert.equal(gate.activate(0, false, start), false)
  assert.equal(gate.activate(.0001, false, start), false)
  assert.equal(starts, 0, "The opening poster must cause zero frame work")
  assert.equal(gate.activate(0, true, start), true)
  assert.equal(starts, 1)
  assert.equal(gate.activate(.5, true, start), false, "Intent may activate only once")
  gate.dispose()
  assert.equal(gate.activate(.8, true, start), false)
  assert.equal(starts, 1, "Disposed gates cannot resurrect frame work")

  const restored = new Gate()
  assert.equal(restored.activate(.25, false, start), true, "Restored nonzero scroll must warm without new input")
  assert.equal(starts, 2)
})

test("production intent listeners and resize work are passive, coalesced and fully disposed", () => {
  const ui = source("cinematic-experience.tsx")
  for (const event of ["wheel", "touchstart"]) {
    assert.match(ui, new RegExp(`addEventListener\\("${event}", onScrollIntent, \\{ passive: true \\}\\)`))
    assert.match(ui, new RegExp(`removeEventListener\\("${event}", onScrollIntent\\)`))
  }
  assert.match(ui, /addEventListener\("keydown", onKeyIntent\)/)
  assert.match(ui, /removeEventListener\("keydown", onKeyIntent\)/)
  assert.match(ui, /if \(resizeFrame === null\) resizeFrame = requestAnimationFrame\(resize\)/)
  assert.match(ui, /if \(resizeFrame !== null\) cancelAnimationFrame\(resizeFrame\)/)
  assert.match(ui, /activation\.dispose\(\)/)
  assert.match(ui, /storyTop = window\.scrollY \+ story\.getBoundingClientRect\(\)\.top/)
  assert.match(ui, /const next = clamp\(\(window\.scrollY - storyTop\) \/ storyRange\)/)
  assert.doesNotMatch(ui, /frameIntervals|rafP95Ms|presentedProgress|presentedFrame/)
})

/** Execute the actual production coordinator; only decode readiness is simulated. */
function productionTickHarness({ presented = 0, target = .18 } = {}) {
  const ui = source("cinematic-experience.tsx")
  const parsed = ts.createSourceFile("cinematic-experience.tsx", ui, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let implementation
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "tick") implementation = node.getText(parsed)
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  assert.ok(implementation, "Test must execute the production tick, not a duplicated algorithm")
  const available = new Set(), requests = [], drawings = [], overlays = []
  let context
  context = vm.createContext({
    frame: null, disposed: false, visible: true, lastTime: 0,
    root: { dataset: {} }, preference: { matches: false }, fallback: false,
    activation: { activated: true },
    presented, interpolated: presented, target, direction: 1, pendingProposal: null,
    CINEMA, follow: timeline.follow, frameAt: timeline.frameAt,
    loadingRef: { current: { setAttribute() {} } },
    cache: { request(position) { requests.push(position) }, failedAt() { return false }, dispose() {} },
    paintFilm(position, progress) {
      if (!available.has(Math.floor(position)) || !available.has(Math.ceil(position))) return false
      drawings.push({ position, progress })
      return true
    },
    paintLayers(progress) { overlays.push(progress) },
    requestTick() { context.frame = 1 },
  })
  vm.runInContext(ts.transpileModule(implementation, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context)
  return {
    context, requests, drawings, overlays,
    ready(position = requests.at(-1)) { available.add(Math.floor(position)); available.add(Math.ceil(position)) },
    tick(now) { context.tick(now) },
  }
}

test("production tick retries its first pending exact pair instead of moving an unpresented goalpost", () => {
  const harness = productionTickHarness()
  harness.tick(16)
  const firstRequest = harness.requests.at(-1)
  assert.ok(firstRequest > 0)
  assert.equal(harness.context.presented, 0)
  assert.equal(harness.drawings.length, 0)
  assert.equal(harness.overlays.length, 0, "HTML cannot run ahead while the canvas is buffering")
  assert.equal(harness.context.root.dataset.buffering, "true")
  harness.ready(firstRequest)
  harness.tick(116)
  assert.equal(harness.requests.at(-1), firstRequest, "A completed pair must be presented before asking for another step")
  assert.equal(harness.drawings.length, 1)
  assert.equal(harness.drawings[0].position, firstRequest)
  assert.equal(harness.context.presented, harness.drawings[0].progress)
  assert.equal(harness.overlays.at(-1), harness.drawings[0].progress)
  assert.equal(harness.context.root.dataset.buffering, "false")
})

test("production tick holds one pending pair across variable RAF intervals and delayed decode callbacks", () => {
  for (const interval of [8, 16, 80]) {
    const harness = productionTickHarness({ presented: .12, target: .34 })
    harness.context.lastTime = 100
    harness.tick(100 + interval)
    const pending = harness.requests.at(-1)
    assert.ok(pending > timeline.frameAt(.12, CINEMA.frameCount, CINEMA.filmEnd))
    assert.equal(harness.context.presented, .12)
    // Background frame decodes and a hidden-tab resume can schedule retries at
    // entirely different timings. None may change the exact requested pair.
    for (const now of [210 + interval, 226 + interval, 306 + interval]) {
      harness.tick(now)
      assert.equal(harness.requests.at(-1), pending, `${interval}ms proposal must survive a changed retry interval`)
      assert.equal(harness.context.presented, .12)
      assert.equal(harness.drawings.length, 0)
      assert.equal(harness.overlays.length, 0)
    }
    harness.ready(pending)
    harness.tick(500 + interval)
    assert.equal(harness.requests.at(-1), pending)
    assert.equal(harness.drawings.length, 1)
    assert.equal(harness.drawings[0].position, pending)
    assert.equal(harness.overlays.at(-1), harness.drawings[0].progress)
    assert.equal(harness.context.pendingProposal, null)
    assert.equal(harness.context.root.dataset.buffering, "false")
    // After presentation, the following actual RAF may make one new proposal.
    harness.tick(508 + interval)
    assert.ok(harness.requests.at(-1) > pending)
  }
})

test("production tick cancels a pending forward proposal on reversal and preserves atomic replay/hidden behavior", () => {
  const harness = productionTickHarness({ presented: .5, target: .8 })
  harness.tick(16)
  const forward = harness.requests.at(-1)
  harness.ready(forward) // Its late decode must not force a frame in the old direction.
  harness.context.target = .2
  harness.context.direction = -1
  harness.tick(116)
  const reverse = harness.requests.at(-1)
  assert.ok(reverse < timeline.frameAt(.5, CINEMA.frameCount, CINEMA.filmEnd))
  assert.notEqual(reverse, forward)
  assert.equal(harness.context.presented, .5)
  assert.equal(harness.drawings.length, 0)
  harness.context.visible = false
  harness.ready(reverse)
  const beforeHidden = harness.requests.length
  harness.tick(216)
  assert.equal(harness.requests.length, beforeHidden)
  assert.equal(harness.overlays.length, 0)
  harness.context.visible = true
  harness.tick(316)
  assert.equal(harness.requests.at(-1), reverse)
  assert.ok(harness.context.presented < .5)
  assert.equal(harness.overlays.at(-1), harness.drawings.at(-1).progress)
  // These are the actual Replay handler's explicit clock resets. Old decoded
  // surfaces must not become a substitute for its exact zero frame.
  harness.context.target = 0
  harness.context.interpolated = 0
  harness.context.presented = 0
  harness.context.lastTime = 0
  harness.context.pendingProposal = null
  const beforeReplay = harness.drawings.length
  harness.tick(416)
  assert.equal(harness.requests.at(-1), 0)
  assert.equal(harness.drawings.length, beforeReplay)
  harness.ready(0)
  harness.tick(516)
  assert.equal(harness.drawings.at(-1).position, 0)
  assert.equal(harness.overlays.at(-1), 0)
})

for (const mobile of [false, true]) test(`real cache bounds all surfaces, chunks and concurrency (${mobile ? "mobile" : "desktop"})`, async () => {
  let closed = 0, fetching = 0, decoding = 0, maxFetch = 0, maxDecode = 0
  const memoryViolations = []
  const width = mobile ? 768 : 1280, height = mobile ? 432 : 720
  const loaded = []
  let cache
  cache = new CinemaFrameCache({
    frameCount: 480, mobile, width, height,
    load: async index => {
      loaded.push(index)
      fetching++; maxFetch = Math.max(fetching, maxFetch)
      await Promise.resolve()
      fetching--
      return new Blob([String(index)])
    },
    decode: async blob => {
      decoding++; maxDecode = Math.max(decoding, maxDecode)
      const index = Number(await blob.text())
      decoding--
      return { index, width, height, close: () => closed++ }
    },
    onChange: () => {
      if (cache.stats.decodedBytes + cache.stats.reservedBytes > cache.budget) memoryViolations.push(cache.stats)
    },
  })
  cache.request(0)
  await settle(() => cache.get(0) && cache.stats.fetching === 0 && cache.stats.decoding === 0)
  assert.equal(loaded[0], 0)
  assert.ok(cache.stats.compressed <= 48)
  assert.ok(cache.stats.decoded <= cache.limit)
  assert.ok(maxFetch <= 4)
  assert.ok(maxDecode <= 2)
  assert.equal(cache.get(300), null, "No arbitrary nearest-frame fallback")
  cache.request(300.5)
  assert.equal(cache.get(300.5), null)
  await settle(() => cache.get(300.5) && cache.stats.fetching === 0 && cache.stats.decoding === 0)
  assert.equal(cache.get(300.5).from.index, 300)
  assert.equal(cache.get(300.5).to.index, 301)
  assert.equal(cache.get(300.5).blend, .5)
  assert.ok(cache.stats.compressed <= 48)
  cache.request(23.75, -1)
  await settle(() => cache.get(23.75))
  assert.equal(cache.get(23.75).from.index, 23)
  assert.equal(cache.get(23.75).to.index, 24)
  cache.request(0)
  assert.equal(cache.get(0), null, "Replay must wait for frame zero, not a nearby cached frame")
  await settle(() => cache.get(0))
  assert.equal(cache.get(0).from.index, 0)
  assert.ok(closed > 0)
  cache.setActive(false)
  const before = loaded.length
  cache.request(479)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(loaded.length, before)
  cache.dispose()
  assert.equal(cache.stats.decoded, 0)
  assert.equal(cache.stats.compressed, 0)
  assert.deepEqual(memoryViolations, [])
})

test("failure falls back, pending disposal cannot resurrect, and oversized surfaces are rejected", async () => {
  const options = {
    frameCount: 480, mobile: false, width: 1280, height: 720,
    load: async index => { if (index === 0) throw Error("offline"); return new Blob([String(index)]) },
    decode: async () => ({ width: 1280, height: 720, close: () => {} }),
    onChange: () => {},
  }
  const failed = new CinemaFrameCache(options)
  failed.request(0)
  await settle(() => failed.failedAt(0))
  assert.equal(failed.get(0), null)
  failed.dispose()
  let released = 0
  const oversized = new CinemaFrameCache({ ...options, load: async () => new Blob(), decode: async () => ({ width: 3840, height: 2160, close: () => released++ }) })
  oversized.request(0)
  await settle(() => oversized.failedAt(0))
  assert.ok(released > 0)
  assert.equal(oversized.get(0), null)
  oversized.dispose()
  let finish
  const stale = new CinemaFrameCache({ ...options, load: async () => new Blob(), decode: () => new Promise(resolve => { finish = () => resolve({ width: 1280, height: 720, close: () => released++ }) }) })
  stale.request(0)
  await settle(() => finish)
  stale.dispose()
  const before = released
  finish()
  await new Promise(resolve => setImmediate(resolve))
  assert.ok(released > before)
  assert.equal(stale.stats.decoded, 0)
})

/** Simulated transport/decode evidence, not browser or device performance evidence. */
function delayedTransport() {
  const network = [], decodes = [], surfaces = [], observations = []
  let cache, changed = 0
  const sample = () => {
    if (cache) observations.push({ ...cache.stats, budget: cache.budget })
    changed++
  }
  cache = new CinemaFrameCache({
    frameCount: 480, mobile: false, width: 1280, height: 720,
    // Intentionally permit completion after abort, modeling an already-completed
    // transport callback racing visibility changes or a new scroll direction.
    load: (index, signal) => new Promise(resolve => {
      const entry = { index, signal, settled: false, complete: () => {
        assert.equal(entry.settled, false, "Transport may complete only once")
        entry.settled = true
        resolve(new Blob([String(index)]))
      } }
      network.push(entry)
    }),
    decode: async blob => {
      const index = Number(await blob.text())
      return new Promise(resolve => {
        const entry = { index, settled: false, complete: () => {
          assert.equal(entry.settled, false, "Decode may complete only once")
          entry.settled = true
          const surface = { index, width: 1280, height: 720, closed: 0, close: () => { surface.closed++ } }
          surfaces.push(surface)
          resolve(surface)
        } }
        decodes.push(entry)
      })
    },
    onChange: sample,
  })
  const pendingNetwork = index => network.find(entry => entry.index === index && !entry.settled && !entry.signal.aborted)
  const pendingDecode = index => decodes.find(entry => entry.index === index && !entry.settled)
  const flush = async () => { await new Promise(resolve => setImmediate(resolve)); sample() }
  const assertBounded = () => {
    for (const observation of observations) {
      assert.ok(observation.fetching <= 4)
      assert.ok(observation.decoding <= 2)
      assert.ok(observation.compressed <= 48)
      assert.ok(observation.decodedBytes + observation.reservedBytes <= observation.budget)
    }
    assert.ok(surfaces.every(surface => surface.closed <= 1), "A surface is never released twice")
  }
  return { cache, network, decodes, surfaces, pendingNetwork, pendingDecode, flush, assertBounded, changes: () => changed }
}

test("simulated delayed transport: cold fast forward then reverse eventually presents only the exact final pair", async () => {
  const transport = delayedTransport(), { cache } = transport
  cache.request(0)
  assert.deepEqual(transport.network.map(entry => entry.index), [0, 1, 2, 3])
  // Network and decoder finish in different orders, with both old decodes
  // still pending when the user changes direction twice.
  transport.pendingNetwork(1).complete()
  await transport.flush()
  transport.pendingNetwork(0).complete()
  await transport.flush()
  assert.ok(transport.pendingDecode(0) && transport.pendingDecode(1))
  cache.request(400.5, 1)
  cache.request(30.25, -1)
  assert.equal(cache.get(0), null)
  assert.equal(cache.get(400.5), null)
  assert.equal(cache.get(30.25), null)
  const oldNetwork = transport.network.filter(entry => !entry.settled)
  assert.ok(oldNetwork.length > 0 && oldNetwork.every(entry => entry.signal.aborted))
  oldNetwork.reverse().forEach(entry => entry.complete())
  await transport.flush()
  // Stale decoded surfaces are released, never inserted as nearest substitutes.
  transport.pendingDecode(1).complete()
  await transport.flush()
  transport.pendingDecode(0).complete()
  await transport.flush()
  assert.ok(transport.surfaces.filter(surface => surface.index <= 1).every(surface => surface.closed === 1))
  assert.equal(cache.get(30.25), null)
  assert.ok(transport.pendingNetwork(30) && transport.pendingNetwork(31))
  transport.pendingNetwork(31).complete()
  await transport.flush()
  transport.pendingDecode(31).complete()
  await transport.flush()
  assert.equal(cache.get(30.25), null, "The upper frame alone cannot stand in for the requested pair")
  transport.pendingNetwork(30).complete()
  await transport.flush()
  transport.pendingDecode(30).complete()
  await transport.flush()
  const pair = cache.get(30.25)
  assert.equal(pair.from.index, 30)
  assert.equal(pair.to.index, 31)
  assert.equal(pair.blend, .25)
  assert.equal(cache.get(400.5), null)
  cache.dispose()
  for (const entry of transport.network.filter(entry => !entry.settled)) entry.complete()
  await transport.flush()
  assert.equal(cache.stats.decoded, 0)
  assert.equal(cache.stats.compressed, 0)
  assert.equal(cache.stats.fetching, 0)
  transport.assertBounded()
})

test("simulated delayed transport: hidden abort/resume and late disposal cannot resurrect surfaces", async () => {
  const transport = delayedTransport(), { cache } = transport
  cache.request(100.5)
  transport.pendingNetwork(101).complete()
  await transport.flush()
  transport.pendingNetwork(100).complete()
  await transport.flush()
  assert.ok(transport.pendingDecode(100) && transport.pendingDecode(101))
  cache.setActive(false)
  const atHide = transport.network.length
  assert.ok(transport.network.filter(entry => !entry.settled).every(entry => entry.signal.aborted))
  cache.request(200.5)
  for (const entry of transport.network.filter(entry => !entry.settled)) entry.complete()
  transport.pendingDecode(100).complete()
  transport.pendingDecode(101).complete()
  await transport.flush()
  assert.equal(transport.network.length, atHide, "Hidden work cannot issue new fetches")
  assert.equal(cache.get(100.5), null)
  assert.equal(cache.get(200.5), null)
  assert.equal(cache.stats.failed, 0, "Visibility aborts are not provider failures")
  assert.ok(transport.surfaces.every(surface => surface.closed === 1))
  cache.setActive(true)
  assert.ok(transport.pendingNetwork(200) && transport.pendingNetwork(201))
  transport.pendingNetwork(201).complete()
  await transport.flush()
  transport.pendingNetwork(200).complete()
  await transport.flush()
  transport.pendingDecode(201).complete()
  await transport.flush()
  assert.equal(cache.get(200.5), null)
  transport.pendingDecode(200).complete()
  await transport.flush()
  assert.equal(cache.get(200.5).from.index, 200)
  assert.equal(cache.get(200.5).to.index, 201)
  // Leave an uncancellable decode plus outstanding network in flight at unmount.
  const extra = transport.network.find(entry => !entry.settled && !entry.signal.aborted)
  assert.ok(extra)
  extra.complete()
  await transport.flush()
  const late = transport.pendingDecode(extra.index)
  assert.ok(late)
  cache.dispose()
  const countAtDispose = transport.network.length
  const changesAtDispose = transport.changes()
  late.complete()
  for (const entry of transport.network.filter(entry => !entry.settled)) entry.complete()
  // Flush without the harness sample so a disposed onChange would be observable.
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(transport.changes(), changesAtDispose, "Late completion cannot notify a disposed renderer")
  cache.setActive(true)
  cache.request(0)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(transport.network.length, countAtDispose)
  assert.equal(cache.get(200.5), null)
  assert.equal(cache.get(0), null)
  assert.equal(cache.stats.decoded, 0)
  assert.equal(cache.stats.compressed, 0)
  assert.equal(cache.stats.decoding, 0)
  assert.equal(cache.stats.fetching, 0)
  assert.ok(transport.surfaces.every(surface => surface.closed === 1))
  transport.assertBounded()
})

test("candidate is isolated from homepage and accessible controls keep real destinations", () => {
  assert.doesNotMatch(readFileSync(new URL("../../../app/page.tsx", import.meta.url), "utf8"), /animated-cinema|neural-return/)
  const ui = source("cinematic-experience.tsx")
  assert.match(ui, /AxWordmark/)
  assert.match(ui, /Return to Standard Site/)
  assert.match(ui, /Replay the experience/)
  assert.match(ui, /Skip to navigation/)
  assert.match(ui, /inert aria-hidden="true"/)
  assert.match(ui, /focus\(\{ preventScroll: true \}\)/)
  assert.match(ui, /document\.hidden/)
  assert.match(ui, /URL\.revokeObjectURL/)
  assert.equal(CINEMA.root, "/animated/neural-cortex-v1", "New immutable frames must not reuse cached production URLs")
  const deliveryPath = new URL(`../../../public${CINEMA.root}/delivery.json`, import.meta.url)
  if (existsSync(deliveryPath)) {
    const delivery = JSON.parse(readFileSync(deliveryPath, "utf8"))
    assert.equal(CINEMA.frameCount, delivery.frameCount)
    assert.equal(CINEMA.fps, delivery.fps)
    assert.equal(delivery.source.audioStreams, 0)
  } else assert.fail("The reviewed delivery manifest must exist before release validation")
})
