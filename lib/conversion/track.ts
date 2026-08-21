"use client"

import { track } from "@vercel/analytics/react"
import { analyticsAttribution, captureAttribution } from "@/lib/conversion/attribution"

export type FunnelEventName =
  | "landing_viewed"
  | "primary_cta_clicked"
  | "booking_opened"
  | "booking_started"
  | "booking_completed"
  | "inquiry_submitted"

export function trackFunnel(name: FunnelEventName) {
  // The current Vercel plan supports two custom-event properties. Keep the
  // funnel dimensioned by first-touch source/campaign; the page URL supplies
  // landing context and the CRM receives the complete attribution payload.
  const payload = analyticsAttribution(captureAttribution())
  track(name, payload)
  window.dispatchEvent(new CustomEvent("axmedia:funnel-event", {
    detail: { name, properties: payload },
  }))
}
