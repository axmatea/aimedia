"use client"

import { useEffect, useRef, type ReactNode } from "react"

/**
 * Restrained magnetic wrapper. The child eases toward the pointer while hovered,
 * then settles back on leave. Only active on fine-pointer devices and never when
 * the user prefers reduced motion. Touch devices and reduced-motion users get a
 * completely static element (no transform, no listeners do anything).
 */
export function Magnetic({
  children,
  strength = 0.3,
  className = "",
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const enabled = useRef(false)

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)")
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => {
      enabled.current = fine.matches && !reduce.matches
    }
    sync()
    fine.addEventListener?.("change", sync)
    reduce.addEventListener?.("change", sync)
    return () => {
      fine.removeEventListener?.("change", sync)
      reduce.removeEventListener?.("change", sync)
    }
  }, [])

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || !enabled.current) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - (rect.left + rect.width / 2)) * strength
    const y = (e.clientY - (rect.top + rect.height / 2)) * strength
    el.style.transform = `translate(${x}px, ${y}px)`
  }

  const reset = () => {
    const el = ref.current
    if (el) el.style.transform = "translate(0px, 0px)"
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={className}
      style={{ transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)" }}
    >
      {children}
    </div>
  )
}
