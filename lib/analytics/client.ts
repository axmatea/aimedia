"use client"

import { sanitizeDimensions, type AnalyticsDimensions, type AnalyticsEventName } from "./schema.mjs"

const SESSION_KEY = "axmedia:anonymous-analytics-session:v1"
let memoryVisitorId: string | undefined

export function trackEvent(name: AnalyticsEventName, dimensions: AnalyticsDimensions = {}): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") return
  if (navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return
  try {
    // Session storage expires with the tab. No cookie, fingerprint or account ID.
    let visitorId = memoryVisitorId
    try { visitorId ||= window.sessionStorage.getItem(SESSION_KEY) || undefined } catch { /* memory fallback */ }
    visitorId ||= window.crypto.randomUUID()
    memoryVisitorId = visitorId
    try { window.sessionStorage.setItem(SESSION_KEY, visitorId) } catch { /* memory fallback */ }
    const body = JSON.stringify({
      name, eventId: window.crypto.randomUUID(), visitorId,
      dimensions: sanitizeDimensions({ ...dimensions, path: dimensions.path ?? window.location.pathname }),
    })
    void fetch("/api/analytics/events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body, keepalive: true, credentials: "omit", referrerPolicy: "no-referrer",
    }).catch(() => { /* Measurement must never interrupt booking. */ })
  } catch { /* Restricted browser APIs must never interrupt conversion. */ }
}
