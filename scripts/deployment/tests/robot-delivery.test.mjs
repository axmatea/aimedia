import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"
import ts from "typescript"

const read = path => readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8")

test("precompressed aliases use native encoding in Next, and Workers owns manual encoded streaming", async () => {
  const context = { exports: {}, process: { env: {} } }
  vm.runInNewContext(ts.transpileModule(read("next.config.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context)
  const rules = await context.exports.default.headers()
  const staticHeaders = read("public/_headers")
  for (const [suffix, encoding] of [["br", "br"], ["gzip", "gzip"]]) {
    const path = `/spline/robot-baked-v2-${suffix}.splinecode`
    const rule = rules.find(item => item.source === path)
    assert.ok(rule, `${path} must also work outside Cloudflare`)
    const headers = Object.fromEntries(rule.headers.map(item => [item.key.toLowerCase(), item.value]))
    assert.equal(headers["content-encoding"], encoding)
    assert.equal(headers["content-type"], "application/octet-stream")
    assert.match(headers["cache-control"], /immutable/)
    assert.match(headers["cache-control"], /no-transform/)
    const block = staticHeaders.split(/\n\s*\n/).find(item => item.startsWith(`${path}\n`))
    assert.ok(block)
    assert.ok(!block.includes("Content-Encoding:"), "Static headers alone cause automatic double-encoding in Workers")
    assert.ok(block.includes("Content-Type: application/octet-stream"))
    assert.ok(block.includes("Cache-Control: no-transform"))
  }
  assert.equal(rules.filter(item => item.headers.some(header => header.key.toLowerCase() === "content-encoding")).length, 2)
  assert.equal((staticHeaders.match(/Content-Encoding:/g) || []).length, 0)
  assert.ok(!staticHeaders.includes("/api/*\n  Cache-Control"))
  for (const file of ["wrangler.jsonc", "wrangler.staging.jsonc"]) {
    const config = JSON.parse(read(file).replace(/^\s*\/\/.*$/gm, ""))
    assert.deepEqual(config.assets.run_worker_first, ["/animated/video/*", "/spline/robot-baked-v2.splinecode", "/spline/robot-baked-v2-br.splinecode", "/spline/robot-baked-v2-gzip.splinecode"])
  }
})

function workerFixture(status = 200, body = "already-compressed") {
  const calls = [], initializers = []
  class ManualResponse extends Response {
    constructor(data, init) { super(data, init); initializers.push(init) }
  }
  const context = { exports: {}, URL, Request, Response: ManualResponse, Headers, Map, Set }
  vm.runInNewContext(ts.transpileModule(read("lib/cloudflare/robot-scene.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context)
  const asset = new Response(status === 304 ? null : body, { status, headers: { ETag: '"content-hash"' } })
  const assets = { fetch: async request => { calls.push(request); return asset } }
  return { serve: request => context.exports.maybeServeRobotScene(request, assets), calls, initializers, asset }
}

test("encoded scene streams once with encodeBody manual and never forwards private headers, queries or ranges", async () => {
  const f = workerFixture()
  const response = await f.serve(new Request("https://example.test/spline/robot-baked-v2.splinecode?private=discard", {
    headers: { "Accept-Encoding": "gzip, br", Cookie: "private", Authorization: "private", Range: "bytes=0-3", "If-None-Match": '"content-hash"' },
  }))
  assert.equal(f.calls.length, 1)
  assert.equal(f.calls[0].url, "https://example.test/spline/robot-baked-v2-br.splinecode")
  assert.equal(f.calls[0].headers.get("Accept-Encoding"), "identity")
  for (const header of ["Cookie", "Authorization", "Range", "If-Range"]) assert.equal(f.calls[0].headers.get(header), null)
  assert.equal(f.calls[0].headers.get("If-None-Match"), '"content-hash"')
  assert.equal(response.headers.get("Content-Encoding"), "br")
  assert.equal(response.headers.get("Vary"), "Accept-Encoding")
  assert.equal(response.headers.get("Accept-Ranges"), "none")
  assert.equal(f.initializers.at(-1).encodeBody, "manual")
  assert.equal(f.asset.bodyUsed, false, "The Worker must not buffer or recompress the body")
  assert.equal(await response.text(), "already-compressed")
})

test("representation negotiation honors quality exclusions and retains gzip and identity fallbacks", async () => {
  for (const [header, suffix, encoding] of [["br;q=0, gzip;q=1", "-gzip", "gzip"], ["gzip;q=0.5, br;q=1", "-br", "br"], ["identity", "", null], ["br;q=0,gzip;q=0", "", null], ["br;q=0.1,identity;q=1", "", null], ["*;q=1", "-br", "br"], ["br;q=nope,gzip;q=0", "", null], ["", "", null]]) {
    const f = workerFixture()
    const response = await f.serve(new Request("https://example.test/spline/robot-baked-v2.splinecode", { headers: { "Accept-Encoding": header } }))
    assert.equal(new URL(f.calls[0].url).pathname, `/spline/robot-baked-v2${suffix}.splinecode`, header)
    assert.equal(response.headers.get("Content-Encoding"), encoding, header)
    await response.body?.cancel()
  }
  const f = workerFixture()
  const response = await f.serve(new Request("https://example.test/spline/robot-baked-v2.splinecode", { headers: { "Accept-Encoding": "*;q=0" } }))
  assert.equal(response.status, 406)
  assert.equal(f.calls.length, 0)
})

test("Cloudflare's original client encoding wins over its rewritten request header", async () => {
  for (const [original, expected] of [["identity", null], ["", null], ["br;q=0,gzip;q=1", "gzip"]]) {
    const f = workerFixture()
    const request = new Request("https://example.test/spline/robot-baked-v2.splinecode", { headers: { "Accept-Encoding": "br, gzip" } })
    Object.defineProperty(request, "cf", { value: { clientAcceptEncoding: original } })
    const response = await f.serve(request)
    assert.equal(response.headers.get("Content-Encoding"), expected, original)
    await response.body?.cancel()
  }
})

test("HEAD/304 keep representation metadata; errors, old scenes and other routes are not encoded", async () => {
  const head = workerFixture(304)
  const response = await head.serve(new Request("https://example.test/spline/robot-baked-v2.splinecode", { method: "HEAD", headers: { "Accept-Encoding": "br" } }))
  assert.equal(head.calls[0].method, "HEAD")
  assert.equal(response.status, 304)
  assert.equal(response.headers.get("Content-Encoding"), "br")
  assert.equal(response.body, null)
  const error = workerFixture(404, "missing")
  const missing = await error.serve(new Request("https://example.test/spline/robot-baked-v2-br.splinecode", { headers: { "Accept-Encoding": "br" } }))
  assert.equal(missing.status, 404)
  assert.equal(missing.headers.get("Content-Encoding"), null)
  for (const path of ["/", "/animated", "/api/booking", "/spline/robot.splinecode", "/spline/robot-optimized-v1.splinecode", "/spline/process.wasm"]) {
    assert.equal(await head.serve(new Request(`https://example.test${path}`)), undefined)
  }
  assert.equal(await head.serve(new Request("https://example.test/spline/robot-baked-v2.splinecode", { method: "POST" })), undefined)
})

test("explicit encoded aliases cannot bypass the client's encoding exclusions", async () => {
  for (const [suffix, header] of [["br", "br;q=0,gzip"], ["gzip", "gzip;q=0,br"], ["br", "identity"], ["gzip", ""]]) {
    const f = workerFixture()
    const response = await f.serve(new Request(`https://example.test/spline/robot-baked-v2-${suffix}.splinecode`, { headers: { "Accept-Encoding": header } }))
    assert.equal(response.status, 406)
    assert.equal(f.calls.length, 0)
  }
})
