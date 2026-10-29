"use client"

import type { ReactNode } from "react"
import { LazyMotion, domAnimation } from "motion/react"

// Route-scoped, not an async wrapper around the whole site. Server-rendered
// children are present on the first render, and every homepage m.* island
// (including booking-related descendants) shares the same stable context.
// Cinema and legal routes never import this animation feature bundle.
export function HomeMotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>
}
