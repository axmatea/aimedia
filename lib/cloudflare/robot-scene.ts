import type { AssetFetcher } from "./video-range"

const SCENE = "/spline/robot-baked-v2.splinecode"
const REPRESENTATIONS = {
  identity: SCENE,
  br: "/spline/robot-baked-v2-br.splinecode",
  gzip: "/spline/robot-baked-v2-gzip.splinecode",
} as const
type Encoding = keyof typeof REPRESENTATIONS

function encodingQualities(header: string) {
  const qualities = new Map<string, number>()
  for (const entry of header.toLowerCase().split(",")) {
    const [name, ...parameters] = entry.trim().split(";")
    const parameter = parameters.map(value => value.trim()).find(value => value.startsWith("q="))
    const quality = parameter ? Number(parameter.slice(2)) : 1
    qualities.set(name, Number.isFinite(quality) && quality >= 0 && quality <= 1 ? quality : 0)
  }
  return qualities
}

function encodingFor(header: string | null): Encoding | undefined {
  if (!header?.trim()) return "identity"
  const qualities = encodingQualities(header)
  const br = qualities.get("br") ?? qualities.get("*") ?? 0
  const gzip = qualities.get("gzip") ?? qualities.get("*") ?? 0
  const identity = qualities.get("identity") ?? (qualities.get("*") === 0 ? 0 : 1)
  if (identity > 0 && qualities.has("identity") && identity > Math.max(br, gzip)) return "identity"
  if (br > 0 && br >= gzip) return "br"
  if (gzip > 0) return "gzip"
  return identity > 0 ? "identity" : undefined
}

/** Only this immutable public scene is intercepted. No dynamic compression,
 * buffering, credentials, private cache or external fetch occurs in this path.
 * encodeBody:manual prevents Workers from encoding an already encoded stream.
 */
export async function maybeServeRobotScene(request: Request, assets: AssetFetcher): Promise<Response | undefined> {
  const url = new URL(request.url)
  const explicit = url.pathname === REPRESENTATIONS.br ? "br" : url.pathname === REPRESENTATIONS.gzip ? "gzip" : undefined
  if ((url.pathname !== SCENE && !explicit) || !["GET", "HEAD"].includes(request.method)) return undefined
  // Cloudflare may normalize Accept-Encoding upstream; use the original client
  // preference when provided, including an explicitly empty header.
  const clientEncoding = "cf" in request && request.cf && typeof request.cf === "object" &&
    "clientAcceptEncoding" in request.cf && typeof request.cf.clientAcceptEncoding === "string"
    ? request.cf.clientAcceptEncoding : request.headers.get("Accept-Encoding")
  if (explicit && clientEncoding !== null) {
    const qualities = encodingQualities(clientEncoding)
    if ((qualities.get(explicit) ?? qualities.get("*") ?? 0) === 0) {
      return new Response(null, { status: 406, headers: { "Cache-Control": "no-store", "Vary": "Accept-Encoding" } })
    }
  }
  const encoding = explicit ?? encodingFor(clientEncoding)
  if (!encoding) return new Response(null, { status: 406, headers: { "Cache-Control": "no-store", "Vary": "Accept-Encoding" } })

  const assetUrl = new URL(REPRESENTATIONS[encoding], url.origin)
  const requestHeaders = new Headers({ "Accept-Encoding": "identity" })
  for (const name of ["If-Match", "If-None-Match", "If-Modified-Since", "If-Unmodified-Since"]) {
    const value = request.headers.get(name)
    if (value) requestHeaders.set(name, value)
  }
  // A .splinecode is fetched as one binary. Do not byte-slice an encoded stream
  // or send user query strings/cookies/authorization to the static asset store.
  const asset = await assets.fetch(new Request(assetUrl, { method: request.method, headers: requestHeaders }))
  if (asset.status !== 200 && asset.status !== 304) return asset

  const headers = new Headers(asset.headers)
  headers.set("Content-Type", "application/octet-stream")
  headers.set("Cache-Control", "public, max-age=31536000, immutable, no-transform")
  headers.set("Accept-Ranges", "none")
  headers.set("Vary", [...new Set([...(headers.get("Vary") || "").split(",").map(value => value.trim()).filter(Boolean), "Accept-Encoding"])].join(", "))
  if (encoding === "identity") headers.delete("Content-Encoding")
  else headers.set("Content-Encoding", encoding)
  // Verified against @cloudflare/workers-types 5.20261031.1 and Response docs.
  // DOM's ResponseInit omits this Workers-only option; the intersection retains
  // its exact checked literal without suppressions or an unsafe cast.
  const init: ResponseInit & { encodeBody: "manual" } = {
    status: asset.status, statusText: asset.statusText, headers, encodeBody: "manual",
  }
  return new Response(asset.body, init)
}
