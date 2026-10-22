import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"

// Read-only release verification. No booking, email, analytics, or CRM writes.
const base = new URL(process.argv[2] || "http://127.0.0.1:4215")
assert(["http:", "https:"].includes(base.protocol) && !base.username && !base.password, "Use a credential-free HTTP(S) origin")
const approved = JSON.parse(await readFile(new URL("./neural-cortex-generation.json", import.meta.url), "utf8"))
const root = approved.delivery.root
const digest = bytes => createHash("sha256").update(bytes).digest("hex")
async function get(path) {
  const response = await fetch(new URL(path, base), { redirect: "manual", signal: AbortSignal.timeout(30000) })
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`)
  return response
}
const home = await (await get("/")).text()
assert(!home.includes(root), "The homepage must not preload cinematic media")
const page = await (await get("/animated")).text()
assert(page.includes(root), "The page must reference the new immutable film")
assert.match(page, /name="robots" content="noindex, follow"/)
const paths = ["delivery.json", ...["entity", "brain", "signals"].flatMap(name => [`${name}.webp`, `${name}-mobile.webp`]), ...["desktop", "mobile"].flatMap(variant => [0, 354, 360, 638, 738].map(frame => `frames/${variant}/${String(frame).padStart(4, "0")}.webp`))]
for (const path of paths) {
  const response = await get(`${root}/${path}`)
  const actual = Buffer.from(await response.arrayBuffer())
  const expected = await readFile(new URL(`../../public${root}/${path}`, import.meta.url))
  assert.equal(digest(actual), digest(expected), `${path}: deployed bytes differ from reviewed local release`)
  if (path.endsWith(".webp")) {
    assert.match(response.headers.get("content-type") || "", /image\/webp/)
    assert.match(response.headers.get("cache-control") || "", /immutable/)
  }
}
console.log(JSON.stringify({ origin: base.origin, root, page: "pass", noindex: true, homepageMediaIsolation: "pass", matchingAssets: paths.length }))
