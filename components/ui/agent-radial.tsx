"use client"

import React, { useEffect, useState } from "react"
import { Bot, Search, PenTool, BarChart3, Mail, Brain } from "lucide-react"

const AGENTS = [
  { icon: Search, label: "Lead Gen", color: "#7B2FFF", task: "Enriching 847 contacts" },
  { icon: PenTool, label: "Content", color: "#FF2D55", task: "12 posts scheduled" },
  { icon: BarChart3, label: "Analytics", color: "#0ACDCD", task: "Compiling report" },
  { icon: Mail, label: "Outreach", color: "#C8FF60", darkColor: "#4a7a00", task: "234 emails sent" },
  { icon: Brain, label: "Strategy", color: "#FF8C42", task: "3 campaigns live" },
]

export function AgentRadial() {
  const radius = 125
  const [angleOffset, setAngleOffset] = useState(0)

  useEffect(() => {
    let animationFrame: number
    const animate = () => {
      setAngleOffset((prev) => prev + 0.0015)
      animationFrame = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(animationFrame)
  }, [])

  return (
    <div className="relative w-full max-w-[400px] mx-auto flex flex-col items-center">
      {/* Title */}
      <div className="text-center mb-4">
        <p className="text-black/40 dark:text-white/40 text-[10px] font-mono uppercase tracking-[0.25em]">Live AI Infrastructure</p>
      </div>

      <div className="relative aspect-square w-full max-w-[340px] flex items-center justify-center">
        {/* Orbit rings */}
        <div
          className="absolute rounded-full border border-dashed border-black/10 dark:border-white/8"
          style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }}
        />
        <div
          className="absolute rounded-full border border-black/[0.05] dark:border-white/[0.03]"
          style={{ width: `${radius * 2.5}px`, height: `${radius * 2.5}px` }}
        />

        {/* Central Manager Agent */}
        <div className="relative z-10 flex flex-col items-center justify-center w-[88px] h-[88px] rounded-full bg-gradient-to-br from-[#7B2FFF] to-[#FF2D55] shadow-[0_0_50px_rgba(123,47,255,0.25)]">
          <Bot className="text-white w-9 h-9" />
          <span className="text-[7px] font-bold text-white/90 mt-1 uppercase tracking-[0.15em]">Orchestrator</span>
          {/* Slow pulse */}
          <div className="absolute inset-[-4px] rounded-full border border-[#7B2FFF]/30 animate-[ping_3s_ease-in-out_infinite]" />
        </div>

        {/* Orbiting sub-agents */}
        {AGENTS.map((agent, index) => {
          const angle = (index / AGENTS.length) * 2 * Math.PI + angleOffset
          const x = radius * Math.cos(angle)
          const y = radius * Math.sin(angle)
          const Icon = agent.icon

          return (
            <div
              key={index}
              className="absolute flex flex-col items-center gap-0.5"
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              {/* Agent node */}
              <div
                className="relative flex items-center justify-center w-11 h-11 rounded-full border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] backdrop-blur-sm shadow-sm dark:shadow-none"
                style={{ boxShadow: `0 0 24px ${agent.color}15` }}
              >
                <Icon size={18} style={{ color: agent.color }} />
                {/* Status dot */}
                <span
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0a0a0f]"
                  style={{ backgroundColor: agent.color }}
                />
              </div>
              {/* Label + task */}
              <span className="text-[8px] font-bold text-black/60 dark:text-white/60 whitespace-nowrap mt-0.5">{agent.label} Agent</span>
              <span className="text-[7px] font-mono text-black/30 dark:text-white/25 whitespace-nowrap">{agent.task}</span>
            </div>
          )
        })}
      </div>

      {/* Status footer */}
      <div className="mt-3 flex items-center gap-3 justify-center">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] dark:bg-[#C8FF60] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#22c55e] dark:bg-[#C8FF60]" />
          </span>
          <span className="text-[#16a34a] dark:text-[#C8FF60] text-[9px] font-bold">All systems online</span>
        </div>
        <span className="text-black/20 dark:text-white/15 text-[9px] font-mono">5 agents · 0 errors · 99.9% uptime</span>
      </div>
    </div>
  )
}
