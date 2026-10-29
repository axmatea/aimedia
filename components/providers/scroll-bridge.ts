"use client"

type ScrollTarget = string | HTMLElement
type ScrollOptions = { offset: number; duration: number; easing: (value: number) => number; onComplete?: () => void }
type ScrollInstance = { scrollTo(target: ScrollTarget, options: ScrollOptions): void }

// Navigation imports only this tiny bridge, never the optional scroll runtime.
let activeInstance: ScrollInstance | null = null

export function registerScrollInstance(instance: ScrollInstance) {
  activeInstance = instance
  return () => { if (activeInstance === instance) activeInstance = null }
}

export function lenisScrollTo(target: ScrollTarget, offset = -80) {
  if (typeof window === "undefined") return
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const instance = reducedMotion() ? null : activeInstance
  if (!instance) {
    const element = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target
    element?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" })
    return
  }

  const easing = (value: number) => 1 - Math.pow(1 - value, 3)
  instance.scrollTo(target, {
    offset, duration: 0.85, easing,
    onComplete: () => {
      // Re-measure content-visibility layout drift without touching a new route's instance.
      if (activeInstance !== instance || reducedMotion()) return
      const element = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target
      if (element && Math.abs(element.getBoundingClientRect().top + offset) > 2) {
        instance.scrollTo(element, { offset, duration: 0.18, easing })
      }
    },
  })
}
