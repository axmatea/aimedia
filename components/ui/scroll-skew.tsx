"use client"

import { useScroll, useVelocity, useSpring, useTransform, useReducedMotion, m } from "motion/react"

/** Wraps children and skews them slightly with scroll velocity (premium kinetic accent). */
export function ScrollSkew({ children, className = "", max = 4 }: { children: React.ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const velocity = useVelocity(scrollY)
  const smooth = useSpring(velocity, { stiffness: 200, damping: 50 })
  const skewX = useTransform(smooth, [-3000, 3000], [-max, max], { clamp: true })
  if (reduce) return <div className={className}>{children}</div>
  return <m.div style={{ skewX }} className={className}>{children}</m.div>
}
