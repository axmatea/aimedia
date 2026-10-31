// Local-only visual/geometry review. No production routes, credentials, writes,
// proxying, directory serving or runtime patches. Stop with Ctrl-C.
import { createServer } from "node:http"
import { createHash } from "node:crypto"
import { lstat, readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"

const root = new URL("../../", import.meta.url)
const assets = new Map([
  ["/spline/robot-optimized-v1.splinecode", "public/spline/robot-optimized-v1.splinecode"],
  ["/spline/robot-baked-v2.splinecode", "public/spline/robot-baked-v2.splinecode"],
  ["/spline/process.wasm", "public/spline/process.wasm"],
])
const portArgument = process.argv.find(value => value.startsWith("--port="))
const port = portArgument ? Number(portArgument.slice(7)) : 0
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Expected --port=0..65535")

async function regularFile(path) {
  const url = new URL(path, root)
  const info = await lstat(url)
  if (!info.isFile() || info.isSymbolicLink()) throw new Error("Review assets must be regular files")
  return readFile(url)
}

const bundle = await build({
  entryPoints: [fileURLToPath(new URL("./robot-parity-client.mjs", import.meta.url))],
  absWorkingDir: fileURLToPath(root), bundle: true, write: false,
  platform: "browser", format: "esm", target: "es2022", minify: false,
  define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent",
})
if (bundle.outputFiles.length !== 1) throw new Error("Expected one in-memory review bundle")
const javascript = bundle.outputFiles[0].contents

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Robot runtime parity · local only</title><link rel="icon" href="data:,"><style>
*{box-sizing:border-box}body{margin:0;background:#050507;color:#fff;font:13px system-ui,sans-serif}body[data-theme=light]{background:#f5f4f0;color:#050507}.stage{position:fixed;inset:0;overflow:hidden}.stage canvas{display:block;width:100%;height:100%;background:transparent;pointer-events:none}.stage[data-layout=hero]{left:auto;right:clamp(-2.5rem,-1.6vw,-1rem);width:min(72vw,1080px);height:100%;transform:translate3d(1.5%,0,0)}@media(max-width:1023px){.stage[data-layout=hero]{top:3svh;left:50%;right:auto;width:min(108vw,680px);height:82svh;transform:translate3d(-50%,0,0)}}@media(max-width:420px){.stage[data-layout=hero]{top:4svh;width:106vw;height:80svh}}.panel{position:fixed;z-index:2;top:12px;left:12px;width:min(410px,calc(100vw - 24px));max-height:calc(100svh - 24px);overflow:auto;padding:14px;border:1px solid #80808070;border-radius:12px;background:#111e;color:#fff}h1{font-size:15px;margin:0 0 10px}.controls{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px}button,select{font:inherit;padding:7px 9px;border-radius:7px;border:1px solid #888;background:#222;color:white}button:disabled{opacity:.4}button:focus-visible,select:focus-visible{outline:2px solid #ff2d55;outline-offset:2px}label{display:flex;align-items:center;gap:6px}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:10px/1.45 ui-monospace,monospace;max-height:45vh;overflow:auto}#status{white-space:pre-wrap;line-height:1.5}small{display:block;color:#bbb;line-height:1.4}body[data-panel=hidden] .panel{visibility:hidden}.show-panel{display:none;position:fixed;z-index:3;top:12px;left:12px}body[data-panel=hidden] .show-panel{display:block}
</style></head><body data-theme="dark"><div id="stage" class="stage" data-layout="full"><canvas></canvas></div><button id="show-panel" class="show-panel">Show controls</button><aside class="panel"><h1>Unmodified Spline runtime parity</h1><div class="controls"><button id="baseline">Load baseline</button><button id="baked">Load baked</button><button id="compare">Compare both · initial pose</button></div><div class="controls"><button id="pause" disabled>Pause</button><button id="play" disabled>Play</button><button id="snapshot" disabled>Capture snapshot</button></div><div class="controls"><button id="theme">Light background</button><label>Layout<select id="layout"><option value="full">Full viewport</option><option value="hero">Homepage hero shell</option></select></label><button id="hide-panel">Hide controls</button></div><p id="status" role="status">Ready. Scenes load only after a button is pressed.</p><pre id="summary" aria-label="Compact parity summary">{}</pre><small>Loopback only. Default DPR and source camera. Loads pause immediately after app.load; no runtime monkeypatches. Raw compact buffers may differ: triangle-expanded position/normal hashes prove surface parity. Parameter metadata is diagnostic, not an expected type match.</small><details><summary>Full read-only JSON snapshot / comparison</summary><pre id="result" tabindex="0">{}</pre></details></aside><script type="module" src="/review.js"></script></body></html>`

async function reviewConfig() {
  const manifest = JSON.parse(await regularFile("scripts/deployment/robot-geometry-bake.json"))
  if (!Array.isArray(manifest.meshes) || manifest.meshes.length !== 8 || new Set(manifest.meshes.map(mesh => mesh.id)).size !== 8 || manifest.meshes.some(mesh => !/^[a-f0-9-]{36}$/i.test(mesh.id))) {
    throw new Error("Expected exactly eight reviewed mesh IDs")
  }
  const versions = {}
  for (const [key, url] of [["baseline", "/spline/robot-optimized-v1.splinecode"], ["baked", "/spline/robot-baked-v2.splinecode"]]) {
    const bytes = await regularFile(assets.get(url))
    versions[key] = { url, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }
  }
  return JSON.stringify({ versions, expectedSource: manifest.source.sha256, expectedBaked: manifest.output.sha256, meshes: manifest.meshes.map(({ id, name, buffers }) => ({ id, name, buffers })) })
}

const server = createServer(async (request, response) => {
  const origin = `http://127.0.0.1:${server.address().port}`
  const headers = {
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
    // The trusted installed runtime constructs functions internally. This
    // loopback-only diagnostic allowance does not modify production CSP.
    "Content-Security-Policy": "default-src 'none'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; worker-src 'self' blob:; base-uri 'none'; frame-ancestors 'none'",
  }
  const send = (status, body, type = "text/plain; charset=utf-8") => {
    response.writeHead(status, { ...headers, "Content-Type": type, "Content-Length": Buffer.byteLength(body) })
    response.end(request.method === "HEAD" ? undefined : body)
  }
  if (request.headers.host !== new URL(origin).host || (request.headers.origin && request.headers.origin !== origin)) return send(403, "Loopback origin required")
  if (!["GET", "HEAD"].includes(request.method)) return send(405, "Read-only review")
  const url = new URL(request.url, origin)
  if (url.origin !== origin || url.search) return send(404, "Not found")
  try {
    if (url.pathname === "/") return send(200, html, "text/html; charset=utf-8")
    if (url.pathname === "/review.js") return send(200, javascript, "text/javascript; charset=utf-8")
    if (url.pathname === "/review-config.json") return send(200, await reviewConfig(), "application/json; charset=utf-8")
    const file = assets.get(url.pathname)
    if (!file) return send(404, "Not found")
    return send(200, await regularFile(file), url.pathname.endsWith(".wasm") ? "application/wasm" : "application/octet-stream")
  } catch {
    return send(503, "The reviewed candidate or manifest is not ready")
  }
})
server.listen(port, "127.0.0.1", () => {
  console.log(JSON.stringify({ reviewUrl: `http://127.0.0.1:${server.address().port}/`, pid: process.pid, runtimeBundledBytes: javascript.byteLength }))
})
