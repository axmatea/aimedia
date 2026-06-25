"use client"

import { m } from "motion/react"
import { GlowCard } from "@/components/ui/spotlight-card"
import { CountUp } from "@/components/ui/count-up"

export type CaseStudy = {
  project: string
  tag: string
  result: string
  color: string
  accent: string
}

const glowFor = (accent: string): "purple" | "red" | "green" | "blue" => {
  const a = accent.toUpperCase()
  if (a.includes("7B2FFF") || a.includes("A78BFA")) return "purple"
  if (a.includes("FF2D55") || a.includes("FF6B35") || a.includes("FF8C42")) return "red"
  if (a.includes("C8FF60") || a.includes("4A7A00")) return "green"
  return "blue"
}

// Halal-safe qualitative outcomes by industry. No client names, no fabricated
// hard metrics. Specifics stay behind `verified` (shared under NDA on the call).
const QUALITATIVE: Record<string, string> = {
  "Content Agency": "Booked calls compound week over week. No new headcount.",
  SaaS: "A revenue pipeline that runs itself from day one.",
  "Local Business": "Lower acquisition cost, the whole funnel on autopilot.",
  Web3: "A qualified audience contacted and warmed before launch day.",
}

const Disp = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <span className={`font-display leading-none tracking-wide uppercase ${className}`} style={{ fontFamily: "var(--font-bebas)", ...style }}>
    {children}
  </span>
)

const VP = { once: true, margin: "0px 0px -80px 0px" } as const
const EASE_SWIFT: [number, number, number, number] = [0.2, 0.8, 0.2, 1]

/**
 * PROOF / OUTCOMES — the missing credibility beat.
 * Halal-safe by default (anonymized: industry + qualitative outcome, no client
 * names, no invented metrics). Flip anonymized={false} verified once real cases
 * are confirmed to show client names + animated numbers.
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
    <section id="proof" className="ai-page py-20 md:py-24 px-6 border-b ai-border overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-12 gap-6 flex-wrap">
          <m.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP} transition={{ duration: 0.9, ease: EASE_SWIFT }}>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 border rounded-full ai-tag">Outcomes</span>
            <Disp className="ai-text text-[clamp(2rem,5.5vw,68px)] mt-4 block leading-[0.9]">
              OUTCOMES WE<br /><span style={{ color: "#FF2D55" }}>ENGINEER.</span>
            </Disp>
          </m.div>
          <m.p
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP} transition={{ duration: 0.9, ease: EASE_SWIFT, delay: 0.08 }}
            className="ai-muted text-sm max-w-xs leading-relaxed"
          >
            Patterns we build across content, SaaS, local, and web3. Named results and full numbers shared under NDA on the call.
          </m.p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
          {items.map((c, i) => {
            const headline = anonymized ? c.tag : c.project
            const sub = anonymized ? c.tag : ""
            const body = anonymized ? (QUALITATIVE[c.tag] ?? c.result) : c.result
            return (
              <m.div
                key={c.project}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={VP}
                transition={{ duration: 0.8, ease: EASE_SWIFT, delay: i * 0.08 }}
              >
                <GlowCard glowColor={glowFor(c.accent)} customSize className="w-full h-full min-h-[180px]">
                  <div className="flex flex-col justify-between h-full gap-6">
                    <div className="flex items-center justify-between">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.accent }} />
                      {sub && <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">{sub}</span>}
                    </div>
                    <div>
                      <Disp className="text-white text-[clamp(1.6rem,3vw,2.4rem)] block mb-3 leading-[0.95]">{headline}</Disp>
                      <p className="text-white/70 text-sm md:text-[15px] leading-relaxed">
                        {verified && !anonymized ? <CountUpInline text={body} /> : body}
                      </p>
                    </div>
                  </div>
                </GlowCard>
              </m.div>
            )
          })}
        </div>
      </div>
    </section>
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
