"use client"

import { m, useReducedMotion } from "motion/react"
import {
  ArrowRight,
  Bot,
  Check,
  Database,
  PanelsTopLeft,
  ShieldCheck,
  Sparkles,
  UserRound,
  Workflow,
} from "lucide-react"

const MODULES = [
  { icon: UserRound, eyebrow: "01 · INTAKE", title: "Request Intake", detail: "Briefs, files, and context", color: "#A78BFA" },
  { icon: Bot, eyebrow: "02 · ROUTING", title: "AI Routing", detail: "Classify, enrich, assign", color: "#FF2D55" },
  { icon: ShieldCheck, eyebrow: "03 · CONTROL", title: "Human Review", detail: "Approval gates and owners", color: "#C8FF60" },
  { icon: PanelsTopLeft, eyebrow: "04 · DELIVERY", title: "Client Portal", detail: "Status, decisions, outputs", color: "#5EE7E7" },
]

const ACTIVITY = [
  ["New request routed to delivery", "Now"],
  ["Scope approved by project owner", "12m"],
  ["Client workspace synchronized", "38m"],
]

export function N8nWorkflowBlock() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="platform-os" aria-label="Illustrative custom business platform architecture">
      <div className="platform-os-glow" aria-hidden />

      <header className="platform-os-header">
        <div>
          <p className="platform-os-kicker">AX · BUSINESS OS</p>
          <p className="platform-os-heading">Client Delivery Platform</p>
        </div>
        <div className="platform-os-status"><span aria-hidden />Architecture demo</div>
      </header>

      <div className="platform-os-shell">
        <aside className="platform-os-nav" aria-label="Platform areas">
          <div className="platform-os-mark"><Sparkles size={17} aria-hidden /></div>
          {[
            [PanelsTopLeft, "Portal"],
            [Workflow, "Operations"],
            [Bot, "AI workflows"],
            [Database, "Data layer"],
          ].map(([Icon, label], index) => (
            <div key={String(label)} className={`platform-os-nav-item ${index === 1 ? "is-active" : ""}`}>
              <Icon size={15} aria-hidden />
              <span>{String(label)}</span>
            </div>
          ))}
        </aside>

        <div className="platform-os-main">
          <div className="platform-os-title-row">
            <div>
              <p>CONNECTED WORKFLOW</p>
              <strong>One operating layer from request to delivery</strong>
            </div>
            <span className="platform-os-human"><ShieldCheck size={13} aria-hidden /> Human-controlled</span>
          </div>

          <div className="platform-module-grid">
            {MODULES.map((module, index) => {
              const Icon = module.icon
              return (
                <div className="platform-module-wrap" key={module.title}>
                  <m.div
                    className="platform-module"
                    style={{ "--module-color": module.color } as React.CSSProperties}
                    initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.42, delay: index * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
                  >
                    <span className="platform-module-icon"><Icon size={18} aria-hidden /></span>
                    <span className="platform-module-copy">
                      <small>{module.eyebrow}</small>
                      <strong>{module.title}</strong>
                      <span>{module.detail}</span>
                    </span>
                    <Check className="platform-module-check" size={14} aria-hidden />
                  </m.div>
                  {index < MODULES.length - 1 && (
                    <span className="platform-module-arrow" aria-hidden><ArrowRight size={14} /></span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="platform-os-activity">
            <div className="platform-os-activity-head">
              <span>OPERATIONS FEED</span>
              <span><i aria-hidden /> Systems connected</span>
            </div>
            {ACTIVITY.map(([event, time], index) => (
              <m.div
                key={event}
                className="platform-os-activity-row"
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.35 + index * 0.07 }}
              >
                <span><i aria-hidden />{event}</span>
                <time>{time}</time>
              </m.div>
            ))}
          </div>
        </div>
      </div>

      <footer className="platform-os-footer">
        <span><i className="bg-[#FF2D55]" aria-hidden />4 connected modules</span>
        <span><i className="bg-[#C8FF60]" aria-hidden />Human review gates</span>
        <span><i className="bg-[#5EE7E7]" aria-hidden />Shared data layer</span>
      </footer>
    </div>
  )
}
