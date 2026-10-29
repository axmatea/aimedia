"use client"

import { sanitizeDimensions, UUID, type BrowserEventName } from "./schema.ts"

const SESSION_KEY = "axmedia:analytics-session:v1"
let memorySession: string | undefined

function sessionId() {
  if (memorySession) return memorySession
  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY)
    if (stored && UUID.test(stored)) { memorySession = stored; return stored }
  } catch { /* Storage restrictions do not block the site. */ }
  memorySession = crypto.randomUUID()
  try { window.sessionStorage.setItem(SESSION_KEY, memorySession) } catch { /* Session stays memory-only. */ }
  return memorySession
}

export function trackBrowserEvent(name: BrowserEventName, dimensions: unknown) {
  if (typeof window === "undefined") return
  try {
    if (navigator.doNotTrack === "1" || ("globalPrivacyControl" in navigator && navigator.globalPrivacyControl === true)) return
    const body = JSON.stringify({ eventId: crypto.randomUUID(), visitorId: sessionId(), name, dimensions: sanitizeDimensions(dimensions) })
    // No analytics cookies, referrer URL, full query string or third-party script.
    // Drain the tiny ACK without parsing or retaining it; the caller stays nonblocking.
    void fetch("/api/analytics/events", {
      method: "POST", headers: { "Content-Type": "application/json" }, body,
      credentials: "omit", keepalive: true, cache: "no-store", referrerPolicy: "no-referrer",
    }).then(response => response.arrayBuffer()).catch(() => {})
  } catch { /* Measurement never blocks navigation or a conversion. */ }
}
