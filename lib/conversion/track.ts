"use client"

import { trackEvent } from "@/lib/analytics/client"
import { analyticsAttribution, captureAttribution } from "@/lib/conversion/attribution"

export type FunnelEventName =
  | "page_view"
  | "landing_viewed"
  | "primary_cta_clicked"
  | "booking_opened"
  | "booking_started"
  | "booking_completed"
  | "inquiry_submitted"

export function trackFunnel(name: FunnelEventName) {
  if (typeof window === "undefined") return
  const attribution = captureAttribution()
  const payload = analyticsAttribution(attribution)
  trackEvent(name, {
    ...payload,
    medium: attribution.utmMedium || undefined,
    // No query or fragment leaves the browser: identity, ax_ref and click IDs
    // remain in the separate CRM attribution flow, never in analytics URLs.
    path: window.location.pathname,
  })
  window.dispatchEvent(new CustomEvent("axmedia:funnel-event", {
    detail: { name, properties: payload },
  }))
}
