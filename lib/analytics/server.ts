import { randomUUID } from "node:crypto"
import { getAnalyticsStore } from "./store.mjs"
import type { AnalyticsDimensions, AnalyticsEventName } from "./schema.mjs"

export function recordAnalyticsEvent(
  name: AnalyticsEventName,
  dimensions: AnalyticsDimensions = {},
  identifiers: { eventId?: string; visitorId?: string } = {},
) {
  try {
    return getAnalyticsStore().record({
      name, dimensions, eventId: identifiers.eventId || randomUUID(),
      visitorId: identifiers.visitorId || null,
    })
  } catch { return { status: "error" as const } }
}

export function getAnalyticsHealth() {
  return getAnalyticsStore().health()
}
