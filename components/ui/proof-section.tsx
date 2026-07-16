"use client"

import { m } from "motion/react"
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
  return (
    <section id="proof" className="proof-section ai-page border-b ai-border overflow-hidden">
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
