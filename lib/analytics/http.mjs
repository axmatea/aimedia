import { createHash, timingSafeEqual } from "node:crypto"
import { getAnalyticsStore } from "./store.mjs"
import { validEvent } from "./schema.mjs"

const MAX_BODY_BYTES = 4096
const MAX_VISITORS = 1024
const WINDOW_MS = 60_000

function response(status, body) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } })
}

function allowedOrigins(env) {
  const result = new Set()
  for (const candidate of [env.PUBLIC_BASE_URL, env.RAILWAY_PUBLIC_DOMAIN ? `https://${env.RAILWAY_PUBLIC_DOMAIN}` : ""]) {
    try {
      const url = new URL(candidate)
      if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) result.add(url.origin)
    } catch { /* Invalid configuration must not authorize a caller. */ }
  }
  return result
}

async function boundedJson(request) {
  const reader = request.body?.getReader()
  if (!reader) return { error: 400 }
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BODY_BYTES) { await reader.cancel(); return { error: 413 } }
      chunks.push(value)
    }
    const bytes = Buffer.concat(chunks)
    return { data: JSON.parse(bytes.toString("utf8")) }
  } catch { return { error: 400 } }
  finally { reader.releaseLock() }
}

// No IP, cookie or user-agent enters the limiter or the database. Global and
// session buckets bound work even when callers rotate anonymous session IDs.
export function createAnalyticsHandlers({ env = process.env, store = getAnalyticsStore, now = Date.now } = {}) {
  let windowStart = now()
  let globalRequests = 0
  const visitorRequests = new Map()
  function resetWindow() {
    if (now() - windowStart >= WINDOW_MS) {
      windowStart = now(); globalRequests = 0; visitorRequests.clear()
    }
  }

  async function POST(request) {
    const origin = request.headers.get("origin")
    if (!origin || !allowedOrigins(env).has(origin)) return response(403, { status: "rejected" })
    const site = request.headers.get("sec-fetch-site")
    if (site && site !== "same-origin") return response(403, { status: "rejected" })
    if (request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1") return response(202, { status: "skipped" })
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return response(415, { status: "rejected" })
    const length = Number(request.headers.get("content-length") || 0)
    if (!Number.isFinite(length) || length > MAX_BODY_BYTES) return response(413, { status: "rejected" })
    resetWindow()
    if (++globalRequests > 300) return response(429, { status: "rate_limited" })
    const parsed = await boundedJson(request)
    if (parsed.error) return response(parsed.error, { status: "rejected" })
    const event = validEvent(parsed.data, true)
    if (!event) return response(400, { status: "rejected" })
    const count = visitorRequests.get(event.visitorId) || 0
    if (count >= 60 || (!count && visitorRequests.size >= MAX_VISITORS)) return response(429, { status: "rate_limited" })
    visitorRequests.set(event.visitorId, count + 1)
    // The store revalidates a complete event and independently stamps time/env.
    const result = store().record({ ...event, dimensions: event })
    return response(result.status === "error" || result.status === "disabled" ? 503 : 202, result)
  }

  function GET(request) {
    const expected = env.ANALYTICS_READ_TOKEN
    const authorization = request.headers.get("authorization") || ""
    if (!expected || expected.length < 32) return response(503, { status: "disabled" })
    const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""
    if (supplied.length > 1024 || !timingSafeEqual(
      createHash("sha256").update(supplied).digest(),
      createHash("sha256").update(expected).digest(),
    )) return response(401, { status: "unauthorized" })
    const url = new URL(request.url)
    const days = Number(url.searchParams.get("days") || 30)
    const environment = url.searchParams.get("environment")
    if ((environment && environment !== env.ANALYTICS_ENVIRONMENT) || !Number.isInteger(days) || days < 1 || days > 90) return response(400, { status: "rejected" })
    const result = store().summary({ days, includeQa: url.searchParams.get("includeQa") === "1" })
    return response(result.status === "ok" ? 200 : 503, result)
  }
  return { POST, GET }
}

const handlers = createAnalyticsHandlers()
export const analyticsPost = handlers.POST
export const analyticsSummary = handlers.GET
