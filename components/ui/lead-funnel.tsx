"use client"

import { m } from "motion/react"
import { Users, Filter, Target, Zap, TrendingUp } from "lucide-react"

const FUNNEL_STAGES = [
  { icon: Users, label: "Buyer Signals", state: "CAPTURED", color: "#7B2FFF", width: "100%" },
  { icon: Filter, label: "Fit Review", state: "REVIEWED", color: "#A78BFA", width: "82%" },
  { icon: Target, label: "Account Context", state: "READY", color: "#FF2D55", width: "66%" },
  { icon: Zap, label: "Outreach Draft", state: "APPROVAL", color: "#FF6B35", width: "50%" },
  { icon: TrendingUp, label: "CRM Handoff", state: "SYNCED", color: "#C8FF60", width: "34%" },
]

export function LeadFunnel() {
  return (
    <div className="rounded-3xl overflow-hidden border border-[#7B2FFF]/15 bg-[#0A0518] p-6 md:p-8">
      {/* Funnel stages */}
      <div className="space-y-3">
        {FUNNEL_STAGES.map((stage, i) => {
          const Icon = stage.icon
          const isActive = i === 3

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
                className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-[border-color,background-color] duration-500"
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
                      {stage.state}
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
    </div>
  )
}
