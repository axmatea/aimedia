"use client"

import { useEffect } from "react"
import { frame, cancelFrame } from "motion/react"
import Lenis from "lenis"

// Shared instance so anchor navigation can use Lenis easing too.
let lenisInstance: Lenis | null = null

export function lenisScrollTo(target: string | HTMLElement, offset = -80) {
  if (lenisInstance) {
    // Long, decelerating glide for anchor jumps: quart-out easing over 1.35s.
    lenisInstance.scrollTo(target, { offset, duration: 1.35, easing: (t: number) => 1 - Math.pow(1 - t, 4) })
  } else if (typeof target === "string") {
    document.querySelector(target)?.scrollIntoView({ behavior: "smooth" })
  } else {
    target.scrollIntoView({ behavior: "smooth" })
  }
}

/**
 * Mounts Lenis smooth scroll, driven by motion/react's own frame loop so there
 * is exactly ONE rAF for Lenis + all framer scroll math (no competing loops).
 * Skips entirely under prefers-reduced-motion (native scroll retained).
 * syncTouch:false keeps native mobile momentum and avoids touch-scroll jank.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    // lerp 0.09: heavier, more cinematic glide than the 0.115 default feel,
    // still responsive on trackpads (wheelMultiplier stays 1.0 implicit).
    const lenis = new Lenis({ smoothWheel: true, syncTouch: false, lerp: 0.09 })
    lenisInstance = lenis

    const update = (data: { timestamp: number }) => lenis.raf(data.timestamp)
    frame.update(update, true)

    return () => {
      cancelFrame(update)
      lenis.destroy()
      lenisInstance = null
    }
  }, [])

  return null
}
