import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"
import ts from "typescript"

const source = readFileSync(new URL("../../../lib/cloudflare/video-range.ts", import.meta.url), "utf8")
const context = vm.createContext({
  exports: {}, Request, Response, Headers, URL, Date, Number,
})
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText
vm.runInContext(compiled, context)
const { maybeServeVideoRequest } = context.exports

const bytes = value => new TextEncoder().encode(value)
const body = async response => new TextDecoder().decode(await response.arrayBuffer())

class FakeAssets {
  constructor(value = "0123456789", etag = '"release-a"') {
    this.value = bytes(value)
    this.etag = etag
    this.lastModified = "Wed, 28 Oct 2026 20:00:00 GMT"
    this.calls = []
  }

  update(value, etag) {
    this.value = bytes(value)
    this.etag = etag
  }

  async fetch(input) {
    const request = input instanceof Request ? input : new Request(input)
    this.calls.push({
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers),
    })
    const headers = new Headers({
      "Cache-Control": "public, max-age=86400",
      "Content-Length": String(this.value.byteLength),
      "Content-Type": "video/mp4",
      ETag: this.etag,
      "Last-Modified": this.lastModified,
    })
    if (request.headers.get("If-None-Match") === this.etag) {
      return new Response(null, { status: 304, headers })
    }
    if (request.method === "HEAD") return new Response(null, { status: 200, headers })
    return new Response(this.value.slice(), { status: 200, headers })
  }
}

function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value || "")
  if (!match || (!match[1] && !match[2])) return null
  let start
  let end
  if (!match[1]) {
    const suffix = Number(match[2])
    if (!Number.isInteger(suffix) || suffix <= 0) return null
    start = Math.max(size - suffix, 0)
    end = size - 1
  } else {
    start = Number(match[1])
    end = match[2] ? Number(match[2]) : size - 1
    if (!Number.isInteger(start) || !Number.isInteger(end) || start > end || start >= size) return null
    end = Math.min(end, size - 1)
  }
  return { start, end }
}

class NativeRangeCache {
  entries = new Map()
  puts = []
  matches = []

  async put(request, response) {
    this.puts.push(request.url)
    this.entries.set(request.url, {
      bytes: new Uint8Array(await response.arrayBuffer()),
      headers: new Headers(response.headers),
      status: response.status,
    })
  }

  async match(request) {
    this.matches.push({ url: request.url, headers: Object.fromEntries(request.headers) })
    const entry = this.entries.get(request.url)
    if (!entry) return undefined
    if (request.headers.get("If-None-Match") === entry.headers.get("ETag")) {
      return new Response(null, { status: 304, headers: entry.headers })
    }
    const rangeValue = request.headers.get("Range")
    if (!rangeValue) return new Response(entry.bytes.slice(), { status: entry.status, headers: entry.headers })
    const range = parseRange(rangeValue, entry.bytes.byteLength)
    if (!range) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${entry.bytes.byteLength}` },
      })
    }
    const headers = new Headers(entry.headers)
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${entry.bytes.byteLength}`)
    headers.set("Content-Length", String(range.end - range.start + 1))
    return new Response(entry.bytes.slice(range.start, range.end + 1), { status: 206, headers })
  }
}

const request = (headers = {}, url = "https://aimedia.global/animated/video/desktop/entity.mp4") =>
  new Request(url, { headers })

test("cold and warm Cache API reads return native offset and suffix ranges", async () => {
  const assets = new FakeAssets()
  const cache = new NativeRangeCache()
  const dependencies = { assets, cache }

  const cold = await maybeServeVideoRequest(request({ Range: "bytes=0-3" }), dependencies)
  assert.equal(cold.status, 206)
  assert.equal(cold.headers.get("content-range"), "bytes 0-3/10")
  assert.equal(cold.headers.get("content-length"), "4")
  assert.equal(cold.headers.get("accept-ranges"), "bytes")
  assert.equal(await body(cold), "0123")
  assert.equal(cache.puts.length, 1)
  assert.equal(assets.calls.filter(call => call.method === "GET").length, 1)

  const offset = await maybeServeVideoRequest(request({ Range: "bytes=4-6" }), dependencies)
  assert.equal(offset.status, 206)
  assert.equal(await body(offset), "456")
  const suffix = await maybeServeVideoRequest(request({ Range: "bytes=-2" }), dependencies)
  assert.equal(suffix.status, 206)
  assert.equal(await body(suffix), "89")
  assert.equal(assets.calls.filter(call => call.method === "GET").length, 1, "warm ranges must not refill")
})

test("invalid ranges and conditional range requests preserve HTTP behavior", async () => {
  const assets = new FakeAssets()
  const cache = new NativeRangeCache()
  const dependencies = { assets, cache }
  await maybeServeVideoRequest(request({ Range: "bytes=0-1" }), dependencies)

  const invalid = await maybeServeVideoRequest(request({ Range: "bytes=50-60" }), dependencies)
  assert.equal(invalid.status, 416)
  assert.equal(invalid.headers.get("content-range"), "bytes */10")

  const notModified = await maybeServeVideoRequest(request({
    Range: "bytes=0-1",
    "If-None-Match": '"release-a"',
  }), dependencies)
  assert.equal(notModified.status, 304)

  const matched = await maybeServeVideoRequest(request({
    Range: "bytes=2-4",
    "If-Range": '"release-a"',
  }), dependencies)
  assert.equal(matched.status, 206)
  assert.equal(await body(matched), "234")

  const mismatched = await maybeServeVideoRequest(request({
    Range: "bytes=2-4",
    "If-Range": '"older-release"',
  }), dependencies)
  assert.equal(mismatched.status, 200)
  assert.equal(mismatched.headers.get("content-range"), null)
  assert.equal(await body(mismatched), "0123456789")
})

test("HEAD and ordinary GET preserve conditionals while removing private request data", async () => {
  const assets = new FakeAssets()
  const cache = new NativeRangeCache()
  const url = "https://aimedia.global/animated/video/mobile/entity.mp4?campaign=private"
  const head = await maybeServeVideoRequest(new Request(url, {
    method: "HEAD",
    headers: { Authorization: "Bearer private", Cookie: "private=1", "If-None-Match": '"release-a"' },
  }), { assets, cache })
  assert.equal(head.status, 304)
  assert.equal(head.body, null)
  assert.equal(head.headers.get("accept-ranges"), "bytes")

  const ordinary = await maybeServeVideoRequest(request({ Cookie: "private=1" }, url), { assets, cache })
  assert.equal(ordinary.status, 200)
  assert.equal(await body(ordinary), "0123456789")
  for (const call of assets.calls) {
    const calledUrl = new URL(call.url)
    assert.equal(calledUrl.search, "")
    assert.equal(call.headers.authorization, undefined)
    assert.equal(call.headers.cookie, undefined)
  }
})

test("only safe public MP4 GET and HEAD paths are claimed", async () => {
  const assets = new FakeAssets()
  const cache = new NativeRangeCache()
  for (const input of [
    new Request("https://aimedia.global/animated/video/desktop/entity.mp4", { method: "POST" }),
    request({}, "https://aimedia.global/animated/video/desktop/entity.webm"),
    request({}, "https://aimedia.global/animated/video/%2e%2e/private.mp4"),
    request({}, "https://aimedia.global/api/health"),
  ]) {
    assert.equal(await maybeServeVideoRequest(input, { assets, cache }), undefined)
  }
  assert.equal(assets.calls.length, 0)
})

test("ETag-versioned cache keys invalidate old releases and ignore client queries", async () => {
  const assets = new FakeAssets("abcdefghij", '"release-a"')
  const cache = new NativeRangeCache()
  const url = "https://aimedia.global/animated/video/desktop/entity.mp4?utm_source=private"
  const first = await maybeServeVideoRequest(request({ Range: "bytes=0-2" }, url), { assets, cache })
  assert.equal(await body(first), "abc")

  assets.update("KLMNOPQRST", '"release-b"')
  const second = await maybeServeVideoRequest(request({ Range: "bytes=0-2" }, url), { assets, cache })
  assert.equal(await body(second), "KLM")
  assert.equal(cache.puts.length, 2)
  assert.notEqual(cache.puts[0], cache.puts[1])
  for (const key of cache.puts) {
    const cacheUrl = new URL(key)
    assert.equal(cacheUrl.searchParams.has("utm_source"), false)
    assert.equal(cacheUrl.searchParams.has("__ax_asset_etag"), true)
  }
})

test("cache failures degrade to a complete public asset without manual slicing", async () => {
  const assets = new FakeAssets()
  const cache = {
    async match() { throw new Error("synthetic cache miss failure") },
    async put() { throw new Error("synthetic cache write failure") },
  }
  const response = await maybeServeVideoRequest(request({ Range: "bytes=0-1" }), { assets, cache })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("accept-ranges"), "bytes")
  assert.equal(await body(response), "0123456789")
})
