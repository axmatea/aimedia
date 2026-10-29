"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { registerScrollInstance } from "./scroll-bridge"

/** Optional desktop enhancement; skipped routes and native scrolling load no runtime. */
export function SmoothScroll() {
  const pathname = usePathname()
  useEffect(() => {
    // The cinematic route already interpolates its own timeline.
    if (pathname === "/animated") return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
    let disposed = false
    let generation = 0
    let stop: (() => void) | null = null

    const stopRuntime = () => {
      stop?.()
      stop = null
    }
    const sync = () => {
      const current = ++generation
      stopRuntime()
      if (disposed || reducedMotion.matches || !finePointer.matches) return

      // Both libraries stay behind the eligibility gate, with no gesture delay.
      // import() itself cannot be aborted; the generation prevents stale setup.
      void Promise.all([import("lenis"), import("./scroll-clock")]).then(([{ default: Lenis }, { frame, cancelFrame }]) => {
        if (disposed || current !== generation || reducedMotion.matches || !finePointer.matches) return

        const lenis = new Lenis({ smoothWheel: true, syncTouch: false, lerp: 0.14 })
        const unregister = registerScrollInstance(lenis)
        const update = (data: { timestamp: number }) => lenis.raf(data.timestamp)
        stop = () => {
          unregister()
          cancelFrame(update)
          lenis.destroy()
        }
        // Share Motion's clock instead of creating a competing animation loop.
        frame.update(update, true)
      }).catch(() => {
        if (current === generation) stopRuntime()
        // A failed optional chunk leaves the native anchor fallback available.
      })
    }

    reducedMotion.addEventListener("change", sync)
    finePointer.addEventListener("change", sync)
    sync()
    return () => {
      disposed = true
      generation++
      reducedMotion.removeEventListener("change", sync)
      finePointer.removeEventListener("change", sync)
      stopRuntime()
    }
  }, [pathname])

  return null
}
