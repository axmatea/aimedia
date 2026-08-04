"use client"

/**
 * Hero client islands (v7.2). The hero SECTION itself is server-rendered
 * static markup in app/page.tsx (the LCP headline + subparagraph paint with
 * zero hydration cost); only the genuinely interactive fragments hydrate:
 *
 * - HeroVisual: Lightning WebGL ambient (lg+ only) + the self-hosted Spline
 *   robot. Both were already lazy, ssr:false chunks; the matchMedia gate that
 *   skips mounting Lightning on phones moves here unchanged.
 * - HeroRotator: the stable rotating audience line.
 * - HeroCtas: booking + isolated Animated Experience route.
 *
 * Note on the former entrance animations: the pre-v7.2 hero wrapped the badge,
 * headline, and subcopy in m.div wrappers with initial={false}, which renders
 * the final state with NO mount animation. The server shell reproduces exactly
 * that final state as plain markup, so the paint is pixel-identical.
 */

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { AnimatePresence, m, useReducedMotion } from "motion/react"
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button"
import { Disp } from "@/components/home/shared"
import { HERO_AUDIENCES } from "@/components/home/data"
import { openBooking } from "@/components/home/actions"

const Lightning = dynamic(
  () => import("@/components/ui/lightning").then((mod) => mod.Lightning),
  { ssr: false }
)
const SplineScene = dynamic(
  () => import("@/components/ui/splite").then((mod) => mod.SplineScene),
  { ssr: false }
)

// ── HeroVisual: Lightning ambient + Spline robot, adjacent absolute layers ──
export function HeroVisual() {
  // The Lightning WebGL layer is display:none below lg anyway (hidden dark:lg:block),
  // so on phones we skip mounting it entirely: no chunk download, no WebGL context.
  const [desktop, setDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const sync = () => setDesktop(mq.matches)
    sync()
    mq.addEventListener?.("change", sync)
    return () => mq.removeEventListener?.("change", sync)
  }, [])

  return (
    <>
      {/* Lightning behind robot: subtle ambient in the brand-red family, hidden in light mode.
          Mounted only on lg+ viewports (it is display:none below that anyway). */}
      <div className="absolute right-0 top-0 w-[75%] h-full pointer-events-none hidden dark:lg:block z-[1] opacity-30 mix-blend-screen">
        {desktop && <Lightning hue={350} xOffset={0.3} speed={1.0} intensity={0.35} size={2.2} />}
      </div>

      {/* Robot */}
      <div
        className="hero-robot-shell absolute pointer-events-none block z-[2]"
      >
        {/* No static poster: while the Spline runtime boots, the hero right side
            shows only the dark ambient background (gradient + red bloom + Lightning).
            The live scene fades and settles in over it when ready. */}
        {/* Scene + runtime wasm are self-hosted (public/spline/): no third-party
            fetches at runtime. Source of truth: Spline export kZDDjO5HuC9GJUM2.
            To update the scene, re-export and replace the files (see splite.tsx). */}
        <SplineScene scene="/spline/robot.splinecode" className="w-full h-full dark:opacity-100 opacity-90 dark:mix-blend-normal mix-blend-normal lg:mix-blend-luminosity" />
        <div className="ai-hero-fade-x absolute inset-y-0 left-0 w-[50%]" />
        <div className="ai-hero-fade-y absolute bottom-0 left-0 right-0 h-56" />
        <div className="ai-hero-fade-x absolute inset-y-0 right-0 w-[15%] rotate-180 block dark:hidden" />
      </div>
    </>
  )
}

// ── HeroRotator: concise audiences, one stable line on every viewport ───────
export function HeroRotator() {
  const [audienceIndex, setAudienceIndex] = useState(0)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) return
    const timer = window.setInterval(
      () => setAudienceIndex((current) => (current + 1) % HERO_AUDIENCES.length),
      2800,
    )
    return () => window.clearInterval(timer)
  }, [reducedMotion])

  return (
    <>
      <span className="sr-only">For founders, builders, Web3 teams, and modern businesses</span>
      <div className="hero-audience-rotator overflow-hidden" aria-hidden="true">
        <div>
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={audienceIndex}
            initial={reducedMotion ? false : { y: "88%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={reducedMotion ? undefined : { y: "-88%", opacity: 0 }}
            transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
          >
            <Disp className="hero-audience-line block ai-muted">
              FOR {HERO_AUDIENCES[audienceIndex]}
            </Disp>
          </m.div>
        </AnimatePresence>
        </div>
      </div>
    </>
  )
}

// ── HeroCtas: commercial action + opt-in animated route ────────────────────
export function HeroCtas() {
  return (
    <div className="grid grid-cols-1 min-[500px]:grid-cols-2 gap-3 flex-shrink-0 w-full sm:w-auto sm:min-w-[440px]">
      <LiquidMetalButton label="Book a Strategy Call" onClick={openBooking} className="w-full justify-center" />
      <Link
        href="/animated"
        prefetch={false}
        className="w-full px-6 md:px-7 py-3.5 border-2 border-black/20 dark:border-white/25 text-black/70 dark:text-white/80 text-center text-sm font-semibold rounded-full transition-[border-color,color,transform] active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)]:hover:border-[#FF2D55] [@media(hover:hover)]:hover:text-[#FF2D55]"
      >
        Enter Animated Experience
      </Link>
    </div>
  )
}
