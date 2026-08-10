"use client"

import { useRef, useState, type KeyboardEvent } from "react"
import { AnimatePresence, m, useReducedMotion } from "motion/react"
import {
  ArrowRight,
  Bot,
  Check,
  Database,
  FileCheck2,
  MessageSquareText,
  PanelsTopLeft,
  Search,
  ShieldCheck,
  Workflow,
} from "lucide-react"

const PLATFORM_TABS = [
  {
    id: "portal",
    label: "Portal",
    icon: PanelsTopLeft,
    kicker: "CLIENT WORKSPACE",
    title: "One shared view from request to delivery",
    modules: [
      { icon: FileCheck2, eyebrow: "01 · INTAKE", title: "Request Intake", detail: "Briefs, files, and context" },
      { icon: Workflow, eyebrow: "02 · DELIVERY", title: "Delivery Board", detail: "Owners, status, and next steps" },
      { icon: ShieldCheck, eyebrow: "03 · REVIEW", title: "Approval Queue", detail: "Decisions stay human-controlled" },
      { icon: PanelsTopLeft, eyebrow: "04 · HISTORY", title: "Client View", detail: "Outputs and decisions in one place" },
    ],
    activity: [
      ["New brief ready for triage", "Intake"],
      ["Deliverable waiting for approval", "Review"],
      ["Decision added to project history", "Recorded"],
    ],
    footer: ["Shared project state", "Approval gates", "Owned workspace"],
  },
  {
    id: "chat",
    label: "AI Chat",
    icon: MessageSquareText,
    kicker: "GROUNDED ASSISTANT",
    title: "Ask the operation, then act with approval",
    modules: [
      { icon: Database, eyebrow: "01 · CONTEXT", title: "Source Context", detail: "Approved workspace knowledge" },
      { icon: Search, eyebrow: "02 · RETRIEVAL", title: "Evidence Search", detail: "Relevant records and history" },
      { icon: Bot, eyebrow: "03 · RESPONSE", title: "Grounded Answer", detail: "Source-aware output" },
      { icon: ShieldCheck, eyebrow: "04 · ACTION", title: "Approval Gate", detail: "Review before consequential work" },
    ],
    activity: [
      ["Answer grounded in workspace context", "Ready"],
      ["Requested action held for approval", "Review"],
      ["Conversation linked to project record", "Saved"],
    ],
    footer: ["Grounded context", "Permission aware", "Human-controlled actions"],
  },
  {
    id: "data",
    label: "Data Layer",
    icon: Database,
    kicker: "CONNECTED RECORDS",
    title: "A traceable data layer behind every workflow",
    modules: [
      { icon: Database, eyebrow: "01 · RECORDS", title: "Core Records", detail: "Clients, projects, and decisions" },
      { icon: Workflow, eyebrow: "02 · EVENTS", title: "Workflow Events", detail: "State changes captured once" },
      { icon: ShieldCheck, eyebrow: "03 · ACCESS", title: "Permission Layer", detail: "Scoped views by role" },
      { icon: PanelsTopLeft, eyebrow: "04 · OUTPUT", title: "Reporting View", detail: "Operational truth without rework" },
    ],
    activity: [
      ["Project state synchronized", "Current"],
      ["Approval event written to history", "Verified"],
      ["Client view refreshed from source", "Synced"],
    ],
    footer: ["Single source of truth", "Auditable history", "Scoped access"],
  },
] as const

type PlatformTabId = (typeof PLATFORM_TABS)[number]["id"]

export function N8nWorkflowBlock() {
  const reduceMotion = useReducedMotion()
  const [activeId, setActiveId] = useState<PlatformTabId>("portal")
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const active = PLATFORM_TABS.find((tab) => tab.id === activeId) ?? PLATFORM_TABS[0]

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return
    event.preventDefault()

    const lastIndex = PLATFORM_TABS.length - 1
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? lastIndex
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? (index - 1 + PLATFORM_TABS.length) % PLATFORM_TABS.length
          : (index + 1) % PLATFORM_TABS.length

    const nextTab = PLATFORM_TABS[nextIndex]
    setActiveId(nextTab.id)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div className="platform-os" aria-label="Interactive client delivery platform">
      <div className="platform-os-glow" aria-hidden />

      <header className="platform-os-header">
        <div>
          <p className="platform-os-kicker">CLIENT DELIVERY</p>
          <p className="platform-os-heading">Client Delivery Platform</p>
        </div>
      </header>

      <div className="platform-os-shell">
        <div className="platform-os-nav" role="tablist" aria-label="Client delivery platform layers">
          {PLATFORM_TABS.map((tab, index) => {
            const Icon = tab.icon
            const selected = tab.id === activeId
            return (
              <button
                key={tab.id}
                ref={(node) => { tabRefs.current[index] = node }}
                id={`platform-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`platform-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                className={`platform-os-nav-item ${selected ? "is-active" : ""}`}
                onClick={() => setActiveId(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                <Icon size={15} aria-hidden />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div
          className="platform-os-main"
          id={`platform-panel-${active.id}`}
          role="tabpanel"
          aria-labelledby={`platform-tab-${active.id}`}
          tabIndex={0}
        >
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={active.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className="platform-os-title-row">
                <div>
                  <p>{active.kicker}</p>
                  <strong>{active.title}</strong>
                </div>
              </div>

              <div className="platform-module-grid">
                {active.modules.map((module, index) => {
                  const Icon = module.icon
                  return (
                    <div className="platform-module-wrap" key={module.title}>
                      <div
                        className="platform-module"
                        style={{ "--module-color": index === 1 ? "#FF2D55" : index === 2 ? "#C8FF60" : "#F5F4F0" } as React.CSSProperties}
                      >
                        <span className="platform-module-icon"><Icon size={18} aria-hidden /></span>
                        <span className="platform-module-copy">
                          <small>{module.eyebrow}</small>
                          <strong>{module.title}</strong>
                          <span>{module.detail}</span>
                        </span>
                        <Check className="platform-module-check" size={14} aria-hidden />
                      </div>
                      {index < active.modules.length - 1 && (
                        <span className="platform-module-arrow" aria-hidden><ArrowRight size={14} /></span>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="platform-os-activity">
                <div className="platform-os-activity-head">
                  <span>EXAMPLE WORKFLOW</span>
                </div>
                {active.activity.map(([event, state]) => (
                  <div className="platform-os-activity-row" key={event}>
                    <span><i aria-hidden />{event}</span>
                    <time>{state}</time>
                  </div>
                ))}
              </div>
            </m.div>
          </AnimatePresence>
        </div>
      </div>

    </div>
  )
}
