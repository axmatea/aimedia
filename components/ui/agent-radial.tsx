"use client"

import { m, useReducedMotion } from "motion/react"
import { Bot, Search, PenTool, BarChart3, Mail, Brain } from "lucide-react"

const AGENTS = [
  { icon: Search, label: "Lead Gen", color: "#A78BFA", task: "Research and qualification" },
  { icon: PenTool, label: "Content", color: "#FF2D55", task: "Campaign and asset production" },
  { icon: BarChart3, label: "Analytics", color: "#5EE7E7", task: "Reporting and anomaly review" },
  { icon: Mail, label: "Outreach", color: "#C8FF60", task: "Sequences and reply routing" },
  { icon: Brain, label: "Strategy", color: "#FFB078", task: "Priorities and review gates" },
]

/**
 * Responsive orchestrator map.
 *
 * Positions are percentage-based so the same orbital hierarchy scales from
 * mobile to desktop. The constellation rotates slowly while each card
 * counter-rotates to stay readable; reduced-motion users get a static map.
 */
export function AgentRadial() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="agent-system" role="img" aria-label="One orchestrator coordinating five specialized AI agents">
      <p className="agent-system-kicker">AI infrastructure · illustrative architecture</p>

      <div className="agent-orbit-stage">
        <div className="agent-orbit-ring agent-orbit-ring-outer" aria-hidden />
        <div className="agent-orbit-ring agent-orbit-ring-inner" aria-hidden />

        <div className="agent-orbit-rotor">
          <svg className="agent-connections" viewBox="0 0 100 100" fill="none" aria-hidden>
            {AGENTS.map((agent, index) => {
              const angle = (index / AGENTS.length) * Math.PI * 2 - Math.PI / 2
              const x1 = 50 + Math.cos(angle) * 9
              const y1 = 50 + Math.sin(angle) * 9
              const x2 = 50 + Math.cos(angle) * 30
              const y2 = 50 + Math.sin(angle) * 30
              return (
                <g key={agent.label}>
                  <line
                    className="agent-connection-base"
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={agent.color}
                    strokeWidth="0.42"
                    strokeLinecap="round"
                  />
                  <line
                    className="agent-connection-flow"
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={agent.color}
                    strokeWidth="0.72"
                    strokeLinecap="round"
                    pathLength="1"
                    style={{ animationDelay: `${index * -0.46}s` }}
                  />
                </g>
              )
            })}
          </svg>

          {AGENTS.map((agent, index) => {
            const angle = (index / AGENTS.length) * Math.PI * 2 - Math.PI / 2
            const x = 50 + Math.cos(angle) * 33
            const y = 50 + Math.sin(angle) * 33
            const Icon = agent.icon
            return (
              <div
                key={agent.label}
                className={`agent-orbit-node agent-orbit-node-${index}`}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className="agent-node-counter">
                  <m.div
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.86 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.42, delay: index * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
                  >
                    <div className="agent-node" style={{ "--agent-color": agent.color } as React.CSSProperties}>
                      <span className="agent-node-icon" aria-hidden>
                        <Icon size={20} />
                      </span>
                      <span className="agent-node-copy">
                        <strong>{agent.label}</strong>
                        <small>{agent.task}</small>
                      </span>
                    </div>
                  </m.div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="agent-orchestrator">
          <Bot aria-hidden />
          <strong>Orchestrator</strong>
          <span>Routes · reviews · coordinates</span>
        </div>
      </div>

      <div className="agent-system-footer">
        <span className="agent-status-dot" aria-hidden />
        Five specialized agents, one accountable operating layer
      </div>
    </div>
  )
}
