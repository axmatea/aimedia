"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"

/**
 * Counts a stat value up when it enters the viewport (once).
 * Preserves prefix/suffix around the number: "2,400+", "6.8x", "$2.4M", "<30s", "80 hrs".
 * easeOutCubic over 1600ms, rAF-driven, zero cost off-screen, reduced-motion safe.
 */
export function CountUp({ value, duration = 1600 }: { value: string; duration?: number }) {
  const parsed = useMemo(() => {
    const match = value.match(/^([^\d]*)([\d,]+(?:\.\d+)?)([\s\S]*)$/)
    if (!match) return null
    const target = parseFloat(match[2].replace(/,/g, ""))
    if (Number.isNaN(target)) return null
    return {
      prefix: match[1],
      target,
      decimals: (match[2].split(".")[1] || "").length,
      grouped: match[2].includes(","),
      suffix: match[3],
    }
  }, [value])

  const format = (n: number) =>
    parsed!.grouped ? Math.round(n).toLocaleString("en-US") : n.toFixed(parsed!.decimals)

  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(() => (parsed ? format(0) : value))

  useEffect(() => {
    if (!parsed || !inView) return
    if (reduceMotion) {
      setDisplay(format(parsed.target))
      return
    }
    let raf: number
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(format(parsed.target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed, inView, reduceMotion, duration])

  if (!parsed) return <span>{value}</span>
  return (
    <span ref={ref}>
      {parsed.prefix}
      {display}
      {parsed.suffix}
    </span>
  )
}
