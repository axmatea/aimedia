import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
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
    for (let step = 0; step <= 1000; step++) {
      const progress = step / 1000
      const framing = timeline.framingAt(progress, width / height < .95 ? CINEMA.framing.portrait : CINEMA.framing.desktop)
      const rect = timeline.filmRect(width, height, 16 / 9, framing)
      assert.ok(Math.abs(rect.width / rect.height - 16 / 9) < .000001)
      assert.ok(rect.y >= 0 && rect.y + rect.height <= height, "Complete source height must fit intermediate portrait sizes")
      if (previous) assert.ok(Math.abs(rect.width - previous.width) < width * .0075, "Camera must not snap")
      previous = rect
    }
  }
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
  assert.match(ui, /if \(ready\) \{ presented = interpolated; paintLayers\(presented\) \}/)
  assert.match(ui, /addEventListener\("scroll", readScroll, \{ passive: true \}\)/)
  assert.doesNotMatch(ui, /preventDefault|addEventListener\("wheel"/)
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
  const delivery = JSON.parse(readFileSync(new URL("../../../public/animated/neural-return/delivery.json", import.meta.url), "utf8"))
  assert.equal(CINEMA.frameCount, delivery.frameCount)
  assert.equal(CINEMA.fps, delivery.fps)
  assert.equal(delivery.source.audioStreams, 0)
})
