"use client"

import { useEffect, useState } from "react"
import { m } from "motion/react"
import { Users, Filter, Target, Zap, TrendingUp } from "lucide-react"

const FUNNEL_STAGES = [
  { icon: Users, label: "Prospects Scraped", value: 12847, color: "#7B2FFF", width: "100%" },
  { icon: Filter, label: "Qualified Leads", value: 3216, color: "#A78BFA", width: "72%" },
  { icon: Target, label: "Contacted", value: 1840, color: "#FF2D55", width: "52%" },
  { icon: Zap, label: "Replies", value: 634, color: "#FF6B35", width: "34%" },
  { icon: TrendingUp, label: "Meetings Booked", value: 187, color: "#C8FF60", width: "18%" },
]

export function LeadFunnel() {
  const [counts, setCounts] = useState(FUNNEL_STAGES.map(() => 0))
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    // Animate counting up
    const duration = 1500
    const steps = 40
    const interval = duration / steps

    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = Math.min(step / steps, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setCounts(FUNNEL_STAGES.map((s) => Math.round(s.value * eased)))
      if (step >= steps) clearInterval(timer)
    }, interval)

    return () => clearInterval(timer)
  }, [])

  // Cycle active stage indicator
  useEffect(() => {
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % FUNNEL_STAGES.length), 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="rounded-3xl overflow-hidden border border-[#7B2FFF]/15 bg-[#0A0518] p-6 md:p-8">
      {/* Header. Honesty rule (v7): this widget shows how a built pipeline
          reads, not real client numbers, and it says so. Never label it Live. */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-white/70 text-[10px] font-mono uppercase tracking-widest">Lead Pipeline · Demo view</p>
          <p className="text-white/70 text-xs font-bold mt-1">Illustrative pipeline</p>
        </div>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7B2FFF] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7B2FFF]" />
        </span>
      </div>

      {/* Funnel stages */}
      <div className="space-y-3">
        {FUNNEL_STAGES.map((stage, i) => {
          const Icon = stage.icon
          const isActive = i === activeIdx

          return (
            <m.div
              key={stage.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="relative"
            >
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500"
                style={{
                  borderColor: isActive ? `${stage.color}40` : "rgba(255,255,255,0.05)",
                  backgroundColor: isActive ? `${stage.color}08` : "rgba(255,255,255,0.02)",
                }}
              >
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${stage.color}15` }}
                >
                  <Icon size={16} style={{ color: stage.color }} />
                </div>

                {/* Label & bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white/85 text-[10px] font-bold uppercase tracking-wider">{stage.label}</span>
                    <span className="text-white font-mono text-xs font-bold" style={{ color: stage.color }}>
                      {counts[i].toLocaleString()}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <m.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: stage.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: stage.width }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: i * 0.15, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            </m.div>
          )
        })}
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/5">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[#C8FF60] text-sm font-bold font-mono">14.6%</p>
            <p className="text-white/75 text-[9px] font-mono">Reply rate</p>
          </div>
          <div>
            {/* #A78BFA (not #7B2FFF): the darker purple fails 4.5:1 on this card */}
            <p className="text-[#A78BFA] text-sm font-bold font-mono">$2.4M</p>
            <p className="text-white/75 text-[9px] font-mono">Pipeline value</p>
          </div>
        </div>
        <p className="text-white/70 text-[9px] font-mono">Demo data</p>
      </div>
    </div>
  )
}
