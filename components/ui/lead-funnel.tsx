"use client"

import { useEffect, useState } from "react"
import { m, useReducedMotion } from "motion/react"
import { CalendarCheck, Mail, MessageCircleReply, Send, Users } from "lucide-react"
import { CountUp } from "@/components/ui/count-up"

// Restored from the strongest historical GTM treatment. The multicolour
// sequence is intentional: each operating handoff gets one controlled signal.
const FUNNEL_STAGES = [
  { icon: Users, label: "Prospects identified", value: "8,487", color: "#7B2FFF", width: "100%" },
  { icon: Mail, label: "Prospect emails", value: "2,088", color: "#A78BFA", width: "72%" },
  { icon: Send, label: "Contacted", value: "1,182", color: "#FF2D55", width: "52%" },
  { icon: MessageCircleReply, label: "Replies", value: "402", color: "#FF6B35", width: "34%" },
  { icon: CalendarCheck, label: "Meetings booked", value: "115", color: "#C8FF60", width: "18%" },
] as const

export function LeadFunnel() {
  const reduceMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setInterval(
      () => setActiveIndex((index) => (index + 1) % FUNNEL_STAGES.length),
      2200,
    )
    return () => window.clearInterval(timer)
  }, [reduceMotion])

  return (
    <div
      className="overflow-hidden rounded-3xl border border-[#7B2FFF]/15 bg-[#0A0518] p-5 sm:p-6 md:p-8"
      aria-label="Illustrative go-to-market pipeline"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Lead pipeline · Demo view</p>
          <p className="mt-1 text-xs font-bold text-white/75">Illustrative pipeline</p>
        </div>
        <span className="relative flex h-2 w-2" aria-hidden>
          {!reduceMotion && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7B2FFF] opacity-70" />}
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7B2FFF]" />
        </span>
      </div>

      <div className="space-y-3" role="list">
        {FUNNEL_STAGES.map((stage, index) => {
          const Icon = stage.icon
          const active = index === activeIndex

          return (
            <m.div
              key={stage.label}
              role="listitem"
              initial={reduceMotion ? false : { opacity: 0, x: -18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ delay: index * 0.08, duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div
                className="flex items-center gap-3 rounded-xl border px-3 py-3 transition-[border-color,background-color] duration-500 sm:px-4"
                style={{
                  borderColor: active ? `${stage.color}40` : "rgba(255,255,255,0.05)",
                  backgroundColor: active ? `${stage.color}08` : "rgba(255,255,255,0.02)",
                }}
              >
                <span
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${stage.color}15`, color: stage.color }}
                >
                  <Icon size={16} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="truncate text-[9px] font-bold uppercase tracking-[0.1em] text-white/80 sm:text-[10px]">{stage.label}</span>
                    <strong className="font-mono text-xs" style={{ color: stage.color }}>
                      <CountUp value={stage.value} duration={1500} />
                    </strong>
                  </span>
                  <span className="block h-1 w-full overflow-hidden rounded-full bg-white/5" aria-hidden>
                    <m.span
                      className="block h-full rounded-full"
                      style={{ backgroundColor: stage.color }}
                      initial={reduceMotion ? { width: stage.width } : { width: 0 }}
                      whileInView={{ width: stage.width }}
                      viewport={{ once: true, amount: 0.35 }}
                      transition={{ duration: 1.1, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </span>
                </span>
              </div>
            </m.div>
          )
        })}
      </div>

      <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/5 pt-4 font-mono">
        <div className="flex gap-5">
          <div>
            <p className="text-sm font-bold text-[#A78BFA]">5-stage</p>
            <p className="text-[9px] text-white/50">Pipeline design</p>
          </div>
          <div>
            <p className="text-sm font-bold text-[#C8FF60]">Human</p>
            <p className="text-[9px] text-white/50">Approval before send</p>
          </div>
        </div>
        <p className="text-[9px] text-white/45">Demo data</p>
      </div>
    </div>
  )
}
