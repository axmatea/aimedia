import "server-only"
import { getAnalyticsRuntime } from "./runtime.ts"
import { recordAnalyticsEvent } from "./store.ts"
import { sanitizeDimensions, type ServerEventName } from "./schema.ts"

/** Optional telemetry must never delay or fail a completed CRM/email transaction. */
export function trackServerEvent(name: ServerEventName, dimensions: unknown = {}) {
  try {
    const runtime = getAnalyticsRuntime()
    if (!runtime) return
    runtime.waitUntil(recordAnalyticsEvent(runtime, {
      eventId: crypto.randomUUID(), visitorId: null, name,
      dimensions: sanitizeDimensions(dimensions),
    }).catch(() => {}))
  } catch { /* No binding, failed telemetry or unavailable context cannot affect a lead. */ }
}
