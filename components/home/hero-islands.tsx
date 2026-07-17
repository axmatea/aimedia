"use client"

/**
 * Hero client islands (v7.2). The hero SECTION itself is server-rendered
 * static markup in app/page.tsx (the LCP headline + subparagraph paint with
 * zero hydration cost); only the genuinely interactive fragments hydrate:
 *
 * - HeroVisual: Lightning WebGL ambient (lg+ only) + the self-hosted Spline
 *   robot. Both were already lazy, ssr:false chunks; the matchMedia gate that
 *   skips mounting Lightning on phones moves here unchanged.
 * - HeroRotator: the rotating audience line (interval + AnimatePresence).
 * - HeroCtas: the two hero buttons (booking dialog trigger + Lenis glide).
 *
 * Note on the former entrance animations: the pre-v7.2 hero wrapped the badge,
 * headline, and subcopy in m.div wrappers with initial={false}, which renders
 * the final state with NO mount animation. The server shell reproduces exactly
 * that final state as plain markup, so the paint is pixel-identical.
 */

import { useState, useEffect } from "react"
import { m, AnimatePresence } from "motion/react"
import dynamic from "next/dynamic"
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button"
import { Disp } from "@/components/home/shared"
import { HERO_AUDIENCES } from "@/components/home/data"
import { scrollToId, openBooking } from "@/components/home/actions"

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
        className="hero-robot-shell robot-mobile absolute right-0 top-0 w-[100%] h-[55svh] lg:bottom-0 lg:w-[65%] lg:h-auto pointer-events-none block z-[2]"
        style={{ transform: "scale(1.35) translate3d(0, -8%, 0)", transformOrigin: "top center", willChange: "transform" }}
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

// ── HeroRotator: the third headline line, cycling through audiences ─────────
export function HeroRotator() {
  const [audienceIdx, setAudienceIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setAudienceIdx((i) => (i + 1) % HERO_AUDIENCES.length), 2600)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="overflow-hidden" style={{ height: "var(--fs-mega)" }}>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={audienceIdx}
          initial={false}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        >
          <Disp className="block ai-muted" style={{ fontSize: "var(--fs-mega)", lineHeight: "var(--lh-mega)" }}>
            FOR {HERO_AUDIENCES[audienceIdx]}
          </Disp>
        </m.div>
      </AnimatePresence>
    </div>
  )
}

// ── HeroCtas: primary booking trigger + services glide ──────────────────────
export function HeroCtas() {
  return (
    <div className="flex gap-3 flex-shrink-0">
      <LiquidMetalButton label="Start a Project" onClick={openBooking} />
      <button type="button" onClick={() => scrollToId("services")} className="px-8 py-3.5 border-2 border-black/20 dark:border-white/25 text-black/70 dark:text-white/80 text-sm font-semibold rounded-full hover:border-[#FF2D55] hover:text-[#FF2D55] transition-[border-color,color]">
        See Services →
      </button>
    </div>
  )
}
