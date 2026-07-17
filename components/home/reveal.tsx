"use client"

/**
 * Reveal (v7.2): thin client wrapper reproducing the page's fadeUp
 * whileInView entrance (opacity 0 / y 24 into place, once, -80px bottom
 * margin). Children arrive as server-rendered JSX via the children-as-props
 * pattern, so wrapping static copy in <Reveal> does NOT pull that copy into
 * the client bundle; only this tiny wrapper hydrates.
 *
 * `easeDefault` exists for the one legacy call site that overrode the
 * transition with { duration: 0.6 } and therefore ran motion's default
 * easing instead of EASE_SWIFT; keep it so the entrance feel is unchanged.
 */

import { m } from "motion/react"
import { VP, EASE_SWIFT } from "@/components/home/data"

export function Reveal({
  children,
  className,
  delay = 0,
  duration = 0.9,
  easeDefault = false,
  role,
  ariaLabel,
}: {
  children?: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  easeDefault?: boolean
  role?: string
  ariaLabel?: string
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VP}
      transition={easeDefault ? { duration, delay } : { duration, delay, ease: EASE_SWIFT }}
      className={className}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </m.div>
  )
}
