"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { trackFunnel } from "@/lib/conversion/track"

export function FunnelAnalytics() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)
  const landed = useRef(false)

  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    trackFunnel("page_view")
    if (!landed.current) {
      landed.current = true
      trackFunnel("landing_viewed")
    }
  }, [pathname])

  return null
}
