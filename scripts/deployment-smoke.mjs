import assert from "node:assert/strict"

// Read-only checks. No booking submission, email, CRM mutation, or signed link.
const baseUrl = new URL(process.argv[2] || "http://127.0.0.1:3000")
assert(["http:", "https:"].includes(baseUrl.protocol), "Use an HTTP(S) URL")
assert(!baseUrl.username && !baseUrl.password, "Do not pass credentials in a URL")
const localWorkerd = process.argv.includes("--local-workerd")
if (localWorkerd) {
  assert(["127.0.0.1", "localhost", "[::1]"].includes(baseUrl.hostname), "Simulator exceptions are loopback-only")
}

async function get(path, init) {
  const response = await fetch(new URL(path, baseUrl), {
    signal: AbortSignal.timeout(30000),
    redirect: "manual",
    ...init,
  })
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`)
  console.log(`PASS ${path}`)
  return response
}

const health = await get("/api/health")
assert.deepEqual(await health.json(), { ok: true })
assert.match(health.headers.get("cache-control") || "", /no-store/)

const home = await get("/")
for (const [key, value] of Object.entries({
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
})) {
  assert.equal(home.headers.get(key), value, `Missing/mismatched ${key}`)
}
const html = await home.text()
// Vercel appends a deployment query to chunk URLs; it is not part of the
// filename and must not make a healthy production page fail this check.
const chunkPath = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)]
  .map(match => match[1])
  .find(src => {
    const url = new URL(src, baseUrl)
    return url.pathname.startsWith("/_next/static/") && url.pathname.endsWith(".js")
  })
assert(chunkPath, "Home must include a Next.js script")
assert.equal(new URL(chunkPath, baseUrl).origin, baseUrl.origin, "Unexpected asset origin")
await get(chunkPath)

for (const path of [
  "/animated", "/systems/qualified-pipeline", "/privacy-policy", "/legal", "/cookies",
  "/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/ax-logo-clean.png",
  "/spline/robot.splinecode", "/spline/process.wasm",
]) {
  const response = await get(path)
  if (path === "/sitemap.xml") assert.match(await response.text(), /qualified-pipeline/)
  else await response.body?.cancel()
}
const video = await fetch(new URL("/animated/video/desktop/entity-through-core.mp4", baseUrl), {
  headers: { Range: "bytes=0-1023" },
  signal: AbortSignal.timeout(30000),
  redirect: "manual",
})
assert.match(video.headers.get("content-type") || "", /video\/mp4/)
if (localWorkerd) {
  // Miniflare's local asset bridge drops Range when reading disk files. The
  // deployed Cloudflare edge supplies range slicing; never relax that gate.
  assert([200, 206].includes(video.status), "Local video must load")
  await video.body?.cancel()
  console.log("SIMULATOR ONLY: remote video byte-range check remains required")
} else {
  assert.equal(video.status, 206, "Video must support range requests")
  assert.match(video.headers.get("content-range") || "", /^bytes 0-1023\/\d+$/)
  assert.equal((await video.arrayBuffer()).byteLength, 1024)
  console.log("PASS video byte-range streaming")
}
console.log("Read-only deployment smoke checks passed; integrations are not exercised.")
