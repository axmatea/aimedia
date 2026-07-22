"use client"

import React, { useEffect, useRef, useState } from "react"
import { m, useReducedMotion } from "motion/react"
import { Bot, Search, PenTool, BarChart3, Mail, Brain } from "lucide-react"

const AGENTS = [
  { icon: Search, label: "Lead Gen", color: "#7B2FFF", tasks: ["Enriching 847 contacts", "Scoring 112 new leads", "Mapping ICP segment 4"] },
  { icon: PenTool, label: "Content", color: "#FF2D55", tasks: ["12 posts scheduled", "Drafting reel script", "Testing 3 hook variants"] },
  { icon: BarChart3, label: "Analytics", color: "#0ACDCD", tasks: ["Compiling report", "Tracking 14 funnels", "Anomaly scan: clear"] },
  { icon: Mail, label: "Outreach", color: "#C8FF60", lime: true, tasks: ["234 emails sent", "31 replies handled", "6 calls being booked"] },
  { icon: Brain, label: "Strategy", color: "#FF8C42", tasks: ["3 campaigns live", "Reallocating budget", "Planning next sprint"] },
]

// Geometry (px, and 1:1 with the beam SVG viewBox units). The dashed boundary
// ring is the visible circle; every node body AND its label must land inside it
// with margin. Nodes orbit well inside the ring, and the container (max 340 =>
// radius 170) leaves a further margin so nothing clips at any width.
const NODE_ORBIT = 80  // node-center distance from the hub (was 125)
const RING = 162       // dashed boundary-ring radius; nodes + labels sit inside it
const INNER_RING = 122 // faint concentric guide between hub and boundary
const BEAM_START = 40  // beam rail start (just outside the 76px hub)
const BEAM_END = 56    // beam rail end (just inside the node body)
const BEAM_PERIOD = 2.8 // seconds; must match .agent-beam / .agent-rx in globals.css

/**
 * Live AI Infrastructure diagram.
 * Pure-CSS choreography (zero per-frame React renders):
 * - constellation rotates via .orbit-rotor (90s), labels stay upright via .orbit-counter (reverse)
 * - data packets travel orchestrator -> agent along SVG beams (stroke-dash animation)
 * - agent nodes flash on packet arrival (.agent-rx box-shadow keyframe)
 * - everything pauses off-screen via [data-paused] + animation-play-state
 */
export function AgentRadial() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const [tick, setTick] = useState(0)
  const reduceMotion = useReducedMotion()

  // Rotate agent task lines every 4s while on screen (live infrastructure feel)
  useEffect(() => {
    if (paused || reduceMotion) return
    const t = setInterval(() => setTick((v) => v + 1), 4000)
    return () => clearInterval(t)
  }, [paused, reduceMotion])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setPaused(!entry.isIntersecting),
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={rootRef}
      data-paused={paused ? "" : undefined}
      className="relative w-full max-w-[400px] mx-auto flex flex-col items-center"
    >
      {/* Title */}
      <div className="text-center mb-4">
        {/* Honesty rule (v7): simulated diagram, labeled as a demo, never Live */}
        <p className="text-black/40 dark:text-white/40 text-[10px] font-mono uppercase tracking-[0.25em]">AI Infrastructure · Demo view</p>
      </div>

      <div className="relative aspect-square w-full max-w-[340px] flex items-center justify-center">
        {/* Orbit rings: dashed circle is the boundary the nodes stay inside */}
        <div
          className="orbit-ring-drift absolute rounded-full border border-dashed border-black/10 dark:border-white/8"
          style={{ width: `${RING * 2}px`, height: `${RING * 2}px` }}
        />
        <div
          className="absolute rounded-full border border-black/[0.05] dark:border-white/[0.03]"
          style={{ width: `${INNER_RING * 2}px`, height: `${INNER_RING * 2}px` }}
        />

        {/* Rotating constellation: beams + agents */}
        <div className="orbit-rotor absolute inset-0">
          {/* Connection beams */}
          <svg className="absolute inset-0 w-full h-full" viewBox="-170 -170 340 340" fill="none" aria-hidden>
            {AGENTS.map((agent, i) => {
              const angle = (i / AGENTS.length) * 2 * Math.PI - Math.PI / 2
              const x1 = BEAM_START * Math.cos(angle)
              const y1 = BEAM_START * Math.sin(angle)
              const x2 = BEAM_END * Math.cos(angle)
              const y2 = BEAM_END * Math.sin(angle)
              const delay = `${(i * (BEAM_PERIOD / AGENTS.length)).toFixed(2)}s`
              const beamStyle = { animationDelay: delay, "--beam-dur": `${(2.4 + i * 0.2).toFixed(1)}s` } as React.CSSProperties
              return (
                <g key={agent.label}>
                  {/* Base rail */}
                  <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="1" className="stroke-black/10 dark:stroke-white/[0.07]" />
                  {!reduceMotion && (
                    <>
                      {/* Soft glow under the packet */}
                      <line
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        pathLength={100} strokeWidth="5" strokeLinecap="round" strokeDasharray="12 188"
                        stroke={agent.color} opacity={0.18}
                        className="agent-beam"
                        data-lime-stroke={agent.lime ? "" : undefined}
                        style={beamStyle}
                      />
                      {/* Traveling data packet */}
                      <line
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        pathLength={100} strokeWidth="2" strokeLinecap="round" strokeDasharray="12 188"
                        stroke={agent.color}
                        className="agent-beam"
                        data-lime-stroke={agent.lime ? "" : undefined}
                        style={beamStyle}
                      />
                    </>
                  )}
                </g>
              )
            })}
          </svg>

          {/* Orbiting sub-agents (counter-rotated to stay upright) */}
          {AGENTS.map((agent, i) => {
            const angle = (i / AGENTS.length) * 2 * Math.PI - Math.PI / 2
            const x = NODE_ORBIT * Math.cos(angle)
            const y = NODE_ORBIT * Math.sin(angle)
            const Icon = agent.icon
            const delay = (i * (BEAM_PERIOD / AGENTS.length)).toFixed(2)
            return (
              <div
                key={agent.label}
                className="absolute left-1/2 top-1/2"
                style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
              >
                <div className="orbit-counter">
                  <m.div
                    className="flex flex-col items-center gap-0.5"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.4 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.6, delay: i * 0.09, ease: [0.2, 0.8, 0.2, 1] }}
                  >
                    {/* Agent node */}
                    <div
                      className={`agent-node relative flex items-center justify-center w-11 h-11 rounded-full border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] shadow-sm dark:shadow-none ${reduceMotion ? "" : "agent-rx"}`}
                      data-lime-glow={agent.lime ? "" : undefined}
                      style={{ "--agent-glow": `${agent.color}55`, animationDelay: `${delay}s`, "--beam-dur": `${(2.4 + i * 0.2).toFixed(1)}s` } as React.CSSProperties}
                    >
                      <Icon size={18} style={{ color: agent.color }} />
                      {/* Status dot */}
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0a0a0f]"
                        style={{ backgroundColor: agent.color }}
                      />
                    </div>
                    {/* Label + task */}
                    <span className="text-[9px] font-bold text-black/75 dark:text-white/75 whitespace-nowrap mt-0.5">{agent.label} Agent</span>
                    <m.span
                      key={agent.tasks[(tick + i) % agent.tasks.length]}
                      initial={reduceMotion ? false : { opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                      className="text-[9px] font-mono text-black/70 dark:text-white/70 whitespace-nowrap"
                    >
                      {agent.tasks[(tick + i) % agent.tasks.length]}
                    </m.span>
                  </m.div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Central Orchestrator (76px hub: beams start just outside its edge) */}
        <div className="relative z-10 flex flex-col items-center justify-center w-[76px] h-[76px] rounded-full bg-gradient-to-br from-[#7B2FFF] to-[#FF2D55] shadow-[0_0_50px_rgba(123,47,255,0.25)]">
          <Bot className="text-white w-8 h-8" />
          <span className="text-[8px] font-bold text-white/90 mt-0.5 uppercase tracking-[0.12em]">Orchestrator</span>
          {/* Two-tone sonar */}
          <div className="absolute inset-[-4px] rounded-full border border-[#7B2FFF]/30 animate-[ping_3s_ease-in-out_infinite]" />
          <div className="absolute inset-[-4px] rounded-full border border-[#FF2D55]/20 animate-[ping_3s_ease-in-out_infinite]" style={{ animationDelay: "1.5s" }} />
        </div>
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
        <span className="text-black/65 dark:text-white/70 text-[9px] font-mono">5 agents · monitored 24/7</span>
      </div>
    </div>
  )
}
