"use client"

import { useRef } from "react"
import Image from "next/image"
import { m, useScroll, useTransform, useReducedMotion, type MotionValue } from "motion/react"
import { GlowCard } from "@/components/ui/spotlight-card"
import { CountUp } from "@/components/ui/count-up"
import { ShowcaseMedia } from "@/components/ui/showcase-media"

export type CaseStudy = {
  project: string
  tag: string
  result: string
  color: string
  accent: string
  /** Editorial render for the card frame. Absent = OutcomeVisual fallback. */
  image?: string
  imageAlt?: string
  imageCaption?: string
  imageSpec?: string[]
}

const glowFor = (accent: string): "purple" | "red" | "green" | "blue" => {
  const a = accent.toUpperCase()
  if (a.includes("7B2FFF") || a.includes("A78BFA")) return "purple"
  if (a.includes("FF2D55") || a.includes("FF6B35") || a.includes("FF8C42")) return "red"
  if (a.includes("C8FF60") || a.includes("4A7A00")) return "green"
  return "blue"
}

const outcomeKindFor = (tag: string): "content" | "saas" | "local" | "web3" => {
  const t = tag.toLowerCase()
  if (t.includes("saas")) return "saas"
  if (t.includes("local")) return "local"
  if (t.includes("web3")) return "web3"
  return "content"
}

// Halal-safe qualitative outcomes by industry. No client names, no fabricated
// hard metrics. Specifics stay behind `verified` (shared under NDA on the call).
const QUALITATIVE: Record<string, string> = {
  "Content Agency": "Booked calls compound week over week. No new headcount.",
  SaaS: "A revenue pipeline that runs itself from day one.",
  "Local Business": "Lower acquisition cost, the whole funnel on autopilot.",
  Web3: "A qualified audience contacted and warmed before launch day.",
}

const OUTCOME_CAPTIONS: Record<ReturnType<typeof outcomeKindFor>, string> = {
  content: "Call velocity",
  saas: "Pipeline stages",
  local: "Local demand",
  web3: "Community graph",
}

const Disp = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <span className={`font-display leading-none tracking-wide uppercase ${className}`} style={{ fontFamily: "var(--font-bebas)", ...style }}>
    {children}
  </span>
)

const VP = { once: true, margin: "0px 0px -80px 0px" } as const
const EASE_SWIFT: [number, number, number, number] = [0.2, 0.8, 0.2, 1]

/**
 * PROOF / OUTCOMES — credibility beat.
 * Halal-safe by default: anonymized industry + qualitative outcome, no invented
 * metrics. Visuals are abstract system snapshots, not client screenshots.
 */
export function ProofSection({
  items,
  anonymized = true,
  verified = false,
}: {
  items: CaseStudy[]
  anonymized?: boolean
  verified?: boolean
}) {
  const sectionRef = useRef<HTMLElement>(null)
  // Scroll progress through the whole section: 0 when its top enters the
  // viewport bottom, 1 when its bottom leaves the viewport top. Drives the
  // ambient background crossfade. `useScroll` is feature-independent (works
  // under LazyMotion domAnimation): MotionValues write styles directly, no
  // React re-renders per scroll frame.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] })
  const ambientImages = items.map((c) => c.image).filter((src): src is string => Boolean(src))

  return (
    // overflow-clip (not hidden): clip does not create a scroll container, so
    // the sticky ambient viewport inside can still stick to the real viewport.
    <section ref={sectionRef} id="proof" className="proof-section ai-page overflow-clip">
      {ambientImages.length > 0 && <ProofAmbient images={ambientImages} progress={scrollYProgress} />}
      <div className="proof-shell">
        <div className="proof-header">
          <m.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP} transition={{ duration: 0.9, ease: EASE_SWIFT }}>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 border rounded-full ai-tag">Outcomes</span>
            <Disp className="ai-text mt-4 block" style={{ fontSize: "var(--fs-display)", lineHeight: "var(--lh-display)" }}>
              OUTCOMES WE<br /><span style={{ color: "var(--red)" }}>ENGINEER.</span>
            </Disp>
          </m.div>
          <m.p
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP} transition={{ duration: 0.9, ease: EASE_SWIFT, delay: 0.08 }}
            className="proof-lead ai-muted"
          >
            Patterns we build across content, SaaS, local, and web3. Named results and full numbers shared under NDA on the call.
          </m.p>
        </div>

        <div className="outcome-grid">
          {items.map((c, i) => {
            const headline = anonymized ? c.tag : c.project
            const sub = anonymized ? c.tag : ""
            const body = anonymized ? (QUALITATIVE[c.tag] ?? c.result) : c.result
            const kind = outcomeKindFor(c.tag)
            return (
              <m.div
                key={c.project}
                initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP}
                transition={{ duration: 0.82, ease: EASE_SWIFT, delay: i * 0.08 }}
                className="outcome-card-wrap"
              >
                <GlowCard glowColor={glowFor(c.accent)} customSize className="w-full h-full min-h-[320px]">
                  <article className={`outcome-card outcome-card-${kind}`} style={{ "--outcome-accent": c.accent, "--outcome-index": i } as React.CSSProperties}>
                    <div className={`outcome-picture${c.image ? " has-media" : ""}`} aria-hidden={c.image ? undefined : true}>
                      {c.image ? (
                        <ShowcaseMedia
                          src={c.image}
                          alt={c.imageAlt ?? `${c.tag} outcome render`}
                          caption={c.imageCaption}
                          spec={c.imageSpec}
                          aspect="auto"
                          className="outcome-media"
                        />
                      ) : (
                        <OutcomeVisual kind={kind} index={i} />
                      )}
                      <span className="outcome-caption">{OUTCOME_CAPTIONS[kind]}</span>
                    </div>

                    <div className="outcome-copy">
                      <div className="outcome-meta">
                        <span className="outcome-dot" />
                        {sub && <span>{sub}</span>}
                      </div>
                      <Disp className="text-white outcome-title block">{headline}</Disp>
                      <p className="outcome-body">
                        {verified && !anonymized ? <CountUpInline text={body} /> : body}
                      </p>
                    </div>
                  </article>
                </GlowCard>
              </m.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/**
 * ProofAmbient: scroll-linked ambient background behind the outcome cards.
 * One heavily dimmed, blurred, full-bleed render crossfades into the next as
 * the visitor scrolls through the section (content -> saas -> local -> web3).
 *
 * Implementation notes:
 * - The layer is absolute inset-0 with a sticky 100svh viewport inside, so on
 *   tall (mobile, single-column) layouts the image stays pinned while cards
 *   scroll over it; on short desktop layouts it simply fills the section.
 * - Opacity is the ONLY animated property (GPU-composited, cheap on mobile).
 *   Blur/dim are static CSS, rasterized once, never animated per frame.
 * - prefers-reduced-motion: single static dimmed image, no crossfade.
 * - Degrades gracefully: with JS or sticky unavailable it is just a static
 *   dimmed first image; never broken.
 * - Dark theme only (globals.css hides it on light): the renders are dark
 *   scenes and would gray out the light canvas.
 * - aria-hidden + empty alt: pure decoration, invisible to AT and to LCP
 *   (below the fold, lazy, and the halved `sizes` keeps variants small since
 *   the layer is blurred anyway).
 */
function ProofAmbient({ images, progress }: { images: string[]; progress: MotionValue<number> }) {
  const reducedMotion = useReducedMotion()
  const slides = reducedMotion ? images.slice(0, 1) : images
  return (
    <div className="proof-ambient" aria-hidden>
      <div className="proof-ambient-viewport">
        {slides.map((src, i) => (
          <AmbientSlide key={src} src={src} progress={progress} index={i} count={slides.length} />
        ))}
      </div>
    </div>
  )
}

function AmbientSlide({
  src,
  progress,
  index,
  count,
}: {
  src: string
  progress: MotionValue<number>
  index: number
  count: number
}) {
  // Slide "centers" spread across the on-screen band of section travel
  // (roughly 0.18..0.82 of the enter-to-exit progress), with a 0.2-wide
  // crossfade ramp on each side. First and last slides clamp to the edges so
  // there is never an empty background.
  const center = 0.18 + (0.64 * index) / Math.max(count - 1, 1)
  const ramp = 0.2
  const input =
    index === 0
      ? [0, center, Math.min(center + ramp, 1)]
      : index === count - 1
        ? [Math.max(center - ramp, 0), center, 1]
        : [center - ramp, center, center + ramp]
  const output = index === 0 ? [1, 1, 0] : index === count - 1 ? [0, 1, 1] : [0, 1, 0]
  const opacity = useTransform(progress, input, output)
  return (
    <m.div className="proof-ambient-slide" style={{ opacity: count === 1 ? 1 : opacity }}>
      <Image src={src} alt="" fill sizes="50vw" loading="lazy" className="proof-ambient-img" />
    </m.div>
  )
}

function OutcomeVisual({ kind, index }: { kind: ReturnType<typeof outcomeKindFor>; index: number }) {
  if (kind === "saas") {
    return (
      <div className="outcome-visual outcome-visual-saas" style={{ "--outcome-index": index } as React.CSSProperties}>
        <span className="pipeline-node" />
        <span className="pipeline-node" />
        <span className="pipeline-node" />
        <span className="pipeline-line" />
        <span className="pipeline-pulse" />
      </div>
    )
  }
  if (kind === "local") {
    return (
      <div className="outcome-visual outcome-visual-local" style={{ "--outcome-index": index } as React.CSSProperties}>
        <span className="local-map-line" />
        <span className="local-pin" />
        <span className="local-ring local-ring-one" />
        <span className="local-ring local-ring-two" />
      </div>
    )
  }
  if (kind === "web3") {
    return (
      <div className="outcome-visual outcome-visual-web3" style={{ "--outcome-index": index } as React.CSSProperties}>
        <span className="web3-orbit web3-orbit-one" />
        <span className="web3-orbit web3-orbit-two" />
        <span className="web3-core" />
        {[0, 1, 2, 3, 4, 5].map((n) => <span key={n} className={`web3-dot web3-dot-${n}`} />)}
      </div>
    )
  }
  return (
    <div className="outcome-visual outcome-visual-content" style={{ "--outcome-index": index } as React.CSSProperties}>
      <span className="content-card content-card-one" />
      <span className="content-card content-card-two" />
      <span className="content-card content-card-three" />
      <span className="content-spark" />
    </div>
  )
}

function CountUpInline({ text }: { text: string }) {
  const m2 = text.match(/^([^\d]*)([\d,]+(?:\.\d+)?[^\s]*)(\s[\s\S]*)?$/)
  if (!m2) return <>{text}</>
  return (
    <>
      {m2[1]}
      <span className="text-white font-bold"><CountUp value={m2[2]} /></span>
      {m2[3] ?? ""}
    </>
  )
}
