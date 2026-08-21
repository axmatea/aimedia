"use client"

import { useEffect, useRef } from "react"
import { Analytics } from "@vercel/analytics/next"
import type { BeforeSendEvent } from "@vercel/analytics/next"
import { redactAnalyticsUrl } from "@/lib/conversion/attribution"
import { trackFunnel } from "@/lib/conversion/track"

function beforeSend(event: BeforeSendEvent): BeforeSendEvent {
  return { ...event, url: redactAnalyticsUrl(event.url) }
}

export function FunnelAnalytics({ analyticsMode = "auto" }: { analyticsMode?: "auto" | "development" }) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    // The Analytics child initializes Vercel's event queue in its own effect.
    // Defer the custom landing event one turn so first-load attribution is not
    // dropped before that queue exists. Automatic page-view tracking remains
    // independent and starts immediately.
    const timeout = window.setTimeout(() => trackFunnel("landing_viewed"), 0)
    return () => window.clearTimeout(timeout)
  }, [])

  return <Analytics beforeSend={beforeSend} mode={analyticsMode} />
}
