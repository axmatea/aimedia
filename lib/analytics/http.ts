import { validEvent } from "./schema.ts"
import { recordAnalyticsEvent, type AnalyticsRuntime } from "./store.ts"

const MAX_BODY_BYTES = 2048
const MAX_BODY_MS = 3000
const MAX_SESSIONS = 1024
const WINDOW_MS = 60_000

function response(status: number, state: string) {
  return Response.json({ status: state }, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } })
}

export function sameAnalyticsOrigin(request: Request) {
  const header = request.headers.get("origin")
  if (!header) return false
  try {
    const target = new URL(request.url), origin = new URL(header)
    if (header !== origin.origin) return false
    if (origin.origin === target.origin) return true
    // The local OpenNext/workerd bridge canonicalizes 127.0.0.1 to localhost.
    // Accept only HTTP loopback aliases on the SAME port. Remote hosts, HTTPS
    // downgrade, wildcard bind addresses and forwarded-host headers cannot opt in.
    const loopback = new Set(["localhost", "127.0.0.1", "[::1]"])
    return target.protocol === "http:" && origin.protocol === "http:"
      && loopback.has(target.hostname) && loopback.has(origin.hostname)
      && target.port === origin.port
  } catch { return false }
}

async function boundedBody(request: Request) {
  const reader = request.body?.getReader()
  if (!reader) return { error: 400 }
  let timer: ReturnType<typeof setTimeout> | undefined
  let complete = false
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("body timeout")), MAX_BODY_MS) })
  try {
    let size = 0
    const chunks: Uint8Array[] = []
    while (true) {
      const { value, done } = await Promise.race([reader.read(), timeout])
      if (done) { complete = true; break }
      size += value.byteLength
      if (size > MAX_BODY_BYTES) return { error: 413 }
      chunks.push(value)
    }
    const body = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
    return { data: JSON.parse(new TextDecoder().decode(body)) as unknown }
  } catch { return { error: 400 } }
  finally {
    clearTimeout(timer)
    if (!complete) void reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

/** Small isolate-local guard, not a claim of durable/global bot rate limiting. */
export function createAnalyticsHandler({ now = Date.now } = {}) {
  let started = now(), requests = 0
  const sessions = new Map<string, number>()
  return async (request: Request, runtime: AnalyticsRuntime | null) => {
    if (!sameAnalyticsOrigin(request)) return response(403, "rejected")
    const site = request.headers.get("sec-fetch-site")
    if (site && site !== "same-origin") return response(403, "rejected")
    if (request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1") return response(202, "skipped")
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return response(415, "rejected")
    const length = request.headers.get("content-length")
    if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) return response(413, "rejected")
    if (!runtime) return response(503, "unavailable")
    if (now() - started >= WINDOW_MS) { started = now(); requests = 0; sessions.clear() }
    if (++requests > 300) return response(429, "rate_limited")
    const parsed = await boundedBody(request)
    if (parsed.error) return response(parsed.error, "rejected")
    const event = validEvent(parsed.data, true)
    if (!event || !event.visitorId) return response(400, "rejected")
    const count = sessions.get(event.visitorId) || 0
    if (count >= 60 || (!count && sessions.size >= MAX_SESSIONS)) return response(429, "rate_limited")
    sessions.set(event.visitorId, count + 1)
    const result = await recordAnalyticsEvent(runtime, {
      eventId: event.eventId, visitorId: event.visitorId, name: event.name,
      dimensions: { source: event.source, campaign: event.campaign, medium: event.medium, path: event.path },
    }, now())
    return response(result.status === "accepted" ? 202 : 503, result.status)
  }
}

export const analyticsPost = createAnalyticsHandler()
