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

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { AnimatePresence, m, useReducedMotion } from "motion/react"
import { useTheme } from "next-themes"
import { ActionButton, ExperienceLink } from "@/components/ui/action-button"
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
  const { resolvedTheme } = useTheme()
  const reducedMotion = useReducedMotion()
  const [robotReady, setRobotReady] = useState(false)
  const handleRobotReady = useCallback(() => setRobotReady(true), [])

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const sync = () => setDesktop(mq.matches)
    sync()
    mq.addEventListener?.("change", sync)
    return () => mq.removeEventListener?.("change", sync)
  }, [])

  return (
    <>
      <picture className={`hero-robot-poster ${robotReady && !reducedMotion ? "is-hidden" : ""}`}>
        <source media="(max-width: 520px)" srcSet="/hero/robot-poster-mobile.webp" />
        <source media="(max-width: 1023px)" srcSet="/hero/robot-poster-tablet.webp" />
        <img
          src="/hero/robot-poster-desktop.webp"
          alt=""
          aria-hidden="true"
          width="1440"
          height="900"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </picture>

      {/* Lightning behind robot: subtle ambient in the brand-red family, hidden in light mode.
          Never load a hidden GPU layer in light mode or reduced-motion mode. */}
      <div className="absolute right-0 top-0 w-[75%] h-full pointer-events-none hidden dark:lg:block z-[1] opacity-30 mix-blend-screen">
        {desktop && resolvedTheme === "dark" && !reducedMotion && <Lightning hue={350} xOffset={0.3} speed={1.0} intensity={0.35} size={2.2} />}
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
        <SplineScene scene="/spline/robot-optimized-v1.splinecode" className="w-full h-full opacity-100 mix-blend-normal" onLoad={handleRobotReady} onReadyChange={setRobotReady} />
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
      <span className="sr-only">For founders, builders, Web3, and businesses</span>
      <span className="hero-audience-rotator block overflow-hidden" aria-hidden="true">
        <span className="block">
        <AnimatePresence mode="wait" initial={false}>
          <m.span
            className="block"
            key={audienceIndex}
            initial={reducedMotion ? false : { y: "88%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={reducedMotion ? undefined : { y: "-88%", opacity: 0 }}
            transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
          >
            <Disp className="hero-audience-line block ai-muted">
              FOR {HERO_AUDIENCES[audienceIndex]}
            </Disp>
          </m.span>
        </AnimatePresence>
        </span>
      </span>
    </>
  )
}

// ── HeroCtas: commercial action + opt-in animated route ────────────────────
export function HeroCtas() {
  return (
    <div className="flex flex-col min-[500px]:flex-row min-[500px]:items-center gap-2 min-[500px]:gap-4 flex-shrink-0 w-full sm:w-auto">
      <ActionButton label="Book a Call" onClick={() => openBooking("hero")} className="w-full min-[500px]:w-auto" />
      <ExperienceLink
        href="/animated"
        prefetch={false}
        label="Enter Animated Experience"
        className="w-full min-[500px]:w-auto"
      />
    </div>
  )
}
