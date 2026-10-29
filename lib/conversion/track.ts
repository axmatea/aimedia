"use client"

import { trackBrowserEvent } from "@/lib/analytics/client"
import { sanitizeDimensions, type BrowserEventName } from "@/lib/analytics/schema"
import { analyticsAttribution, captureAttribution } from "@/lib/conversion/attribution"

export type FunnelEventName = BrowserEventName

export function trackFunnel(name: FunnelEventName) {
  if (typeof window === "undefined") return
  const attribution = captureAttribution()
  const payload = sanitizeDimensions({
    ...analyticsAttribution(attribution), medium: attribution.utmMedium,
    path: window.location.pathname,
  })
  trackBrowserEvent(name, payload)
  window.dispatchEvent(new CustomEvent("axmedia:funnel-event", {
    detail: { name, properties: { source: payload.source, campaign: payload.campaign } },
  }))
}
