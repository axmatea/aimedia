const VIDEO_PATH = /^\/animated\/video\/(?:[a-z0-9][a-z0-9_-]*\/)*[a-z0-9][a-z0-9._-]*\.mp4$/i
const CACHE_VERSION_PARAM = "__ax_asset_etag"

export interface AssetFetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
}

export interface RangeCache {
  match(request: Request): Promise<Response | undefined>
  put(request: Request, response: Response): Promise<void>
}

interface VideoRangeDependencies {
  assets: AssetFetcher
  cache: RangeCache
}

function isVideoPath(pathname: string) {
  return VIDEO_PATH.test(pathname)
}

function canonicalAssetUrl(request: Request) {
  const input = new URL(request.url)
  return new URL(input.pathname, input.origin)
}

function copyConditionalHeaders(request: Request) {
  const headers = new Headers()
  for (const name of ["If-Match", "If-Modified-Since", "If-None-Match", "If-Unmodified-Since"]) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  return headers
}

function assetRequest(request: Request, method: "GET" | "HEAD") {
  return new Request(canonicalAssetUrl(request), {
    method,
    headers: copyConditionalHeaders(request),
  })
}

function versionedCacheRequest(assetUrl: URL, etag: string, source?: Request) {
  const cacheUrl = new URL(assetUrl)
  cacheUrl.searchParams.set(CACHE_VERSION_PARAM, etag)
  const headers = source ? copyConditionalHeaders(source) : new Headers()
  const range = source?.headers.get("Range")
  if (range) headers.set("Range", range)
  return new Request(cacheUrl, { method: "GET", headers })
}

function withByteRangeSupport(response: Response) {
  const headers = new Headers(response.headers)
  headers.set("Accept-Ranges", "bytes")
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function ifRangeMatches(ifRange: string | null, head: Response) {
  if (!ifRange) return true

  const candidate = ifRange.trim()
  const etag = head.headers.get("ETag")
  if (candidate.startsWith('"') || candidate.startsWith("W/")) {
    return Boolean(etag && !candidate.startsWith("W/") && !etag.startsWith("W/") && candidate === etag)
  }

  const ifRangeDate = Date.parse(candidate)
  const lastModified = Date.parse(head.headers.get("Last-Modified") || "")
  return Number.isFinite(ifRangeDate) && Number.isFinite(lastModified) && lastModified <= ifRangeDate
}

async function fetchFullAsset(request: Request, assets: AssetFetcher) {
  return withByteRangeSupport(await assets.fetch(assetRequest(request, "GET")))
}

async function matchRange(cache: RangeCache, request: Request) {
  try {
    return await cache.match(request)
  } catch {
    return undefined
  }
}

/**
 * Serves only public AI Media MP4 assets. Range responses are delegated to the
 * Workers Cache API so the runtime performs native byte slicing; the Worker
 * never buffers or manually slices a complete film in JavaScript.
 */
export async function maybeServeVideoRequest(
  request: Request,
  { assets, cache }: VideoRangeDependencies,
): Promise<Response | undefined> {
  const url = new URL(request.url)
  if (!isVideoPath(url.pathname) || (request.method !== "GET" && request.method !== "HEAD")) {
    return undefined
  }

  if (request.method === "HEAD") {
    return withByteRangeSupport(await assets.fetch(assetRequest(request, "HEAD")))
  }

  const range = request.headers.get("Range")
  if (!range) return fetchFullAsset(request, assets)

  // HEAD supplies a trusted, release-specific cache version without forwarding
  // cookies, authorization or user-controlled query parameters to the asset store.
  const head = await assets.fetch(assetRequest(request, "HEAD"))
  if (!head.ok || !ifRangeMatches(request.headers.get("If-Range"), head)) {
    await head.body?.cancel()
    return fetchFullAsset(request, assets)
  }

  const etag = head.headers.get("ETag")
  const contentLength = head.headers.get("Content-Length")
  await head.body?.cancel()
  if (!etag) return fetchFullAsset(request, assets)

  const assetUrl = canonicalAssetUrl(request)
  const rangedCacheRequest = versionedCacheRequest(assetUrl, etag, request)
  const cached = await matchRange(cache, rangedCacheRequest)
  if (cached) return withByteRangeSupport(cached)

  const cacheKey = versionedCacheRequest(assetUrl, etag)
  const full = await assets.fetch(assetRequest(request, "GET"))
  if (!full.ok || !full.body || full.headers.get("ETag") !== etag) {
    return withByteRangeSupport(full)
  }

  const cacheHeaders = new Headers(full.headers)
  if (contentLength && !cacheHeaders.has("Content-Length")) {
    cacheHeaders.set("Content-Length", contentLength)
  }
  const cacheable = new Response(full.body, {
    status: full.status,
    statusText: full.statusText,
    headers: cacheHeaders,
  })

  try {
    // Cache.put consumes the response stream. Awaiting it is intentional: only
    // then can cache.match apply the requesting client's byte range natively.
    await cache.put(cacheKey, cacheable)
  } catch {
    try {
      await cacheable.body?.cancel()
    } catch {
      // Cache implementations may already have consumed or locked this body.
    }
    return fetchFullAsset(request, assets)
  }

  const partial = await matchRange(cache, rangedCacheRequest)
  return partial ? withByteRangeSupport(partial) : fetchFullAsset(request, assets)
}
