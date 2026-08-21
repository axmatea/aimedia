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
    trackFunnel("landing_viewed")
  }, [])

  return <Analytics beforeSend={beforeSend} mode={analyticsMode} />
}
