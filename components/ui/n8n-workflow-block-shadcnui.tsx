"use client"

import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { AnimatePresence, m, useReducedMotion } from "motion/react"
import {
  Bot,
  Check,
  Database,
  FileCheck2,
  MessageSquareText,
  PanelsTopLeft,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react"

const PLATFORM_TABS = [
  {
    id: "portal",
    label: "Portal",
    icon: PanelsTopLeft,
    title: "One workspace from request to delivery",
    description: "Clients see what is moving, what needs input, and what is ready.",
  },
  {
    id: "chat",
    label: "AI Chat",
    icon: MessageSquareText,
    title: "Answers grounded in the active business",
    description: "The assistant reads approved context and keeps consequential actions human-controlled.",
  },
  {
    id: "data",
    label: "Data Layer",
    icon: Database,
    title: "Structured memory behind every workflow",
    description: "Clients, projects, documents, tasks, and decisions remain connected and traceable.",
  },
] as const

type PlatformTabId = (typeof PLATFORM_TABS)[number]["id"]
type DelayStyle = CSSProperties & { "--demo-delay": string }

function PortalDemo() {
  const stages = [
    { title: "Brief received", detail: "Context and files captured", state: "Complete", icon: Check },
    { title: "System in progress", detail: "Work routed to the delivery team", state: "Active", icon: Workflow },
    { title: "Client review", detail: "Approval remains with the client", state: "Next", icon: ShieldCheck },
  ] as const

  return (
    <div className="platform-demo portal-demo" aria-label="Client portal">
      <div className="platform-demo-toolbar">
        <div>
          <strong>Client workspace</strong>
          <span>Delivery overview</span>
        </div>
        <span className="platform-demo-state"><i aria-hidden />On track</span>
      </div>

      <div className="portal-demo-grid">
        <section className="portal-demo-primary" aria-label="Delivery progress">
          <div className="platform-demo-section-head">
            <strong>Delivery progress</strong>
            <span>3 stages</span>
          </div>
          <div className="portal-progress">
            {stages.map((stage, index) => {
              const Icon = stage.icon
              return (
                <div className={`portal-progress-row portal-progress-row-${index + 1}`} key={stage.title} style={{ "--demo-delay": `${index * 120}ms` } as DelayStyle}>
                  <span className="portal-progress-icon"><Icon size={15} aria-hidden /></span>
                  <span className="portal-progress-copy"><strong>{stage.title}</strong><small>{stage.detail}</small></span>
                  <span className="portal-progress-state">{stage.state}</span>
                </div>
              )
            })}
          </div>
        </section>

        <aside className="portal-demo-side" aria-label="Requests and deliverables">
          <div className="portal-request-card">
            <span className="portal-request-icon"><ShieldCheck size={16} aria-hidden /></span>
            <div><strong>Approval needed</strong><small>Review the proposed workspace structure</small></div>
            <button type="button" tabIndex={-1} aria-hidden>Review</button>
          </div>
          <div className="portal-files">
            <div className="platform-demo-section-head"><strong>Deliverables</strong><span>Current</span></div>
            <div className="portal-file-row"><FileCheck2 size={15} aria-hidden /><span><strong>System map</strong><small>Ready</small></span><Check size={14} aria-hidden /></div>
            <div className="portal-file-row"><PanelsTopLeft size={15} aria-hidden /><span><strong>Portal prototype</strong><small>In review</small></span><i aria-hidden /></div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function ChatDemo() {
  return (
    <div className="platform-demo chat-demo" aria-label="Business AI assistant">
      <div className="platform-demo-toolbar">
        <div><strong>Business assistant</strong><span>Grounded in approved workspace context</span></div>
        <span className="platform-demo-state"><i aria-hidden />Context ready</span>
      </div>

      <div className="chat-demo-body">
        <div className="chat-message chat-message-user">
          <span>You</span>
          <p>What still needs my attention?</p>
        </div>
        <div className="chat-message chat-message-ai">
          <span><Bot size={13} aria-hidden />AI Media</span>
          <p>I connect approvals and next actions to their source context, so you can review what needs attention before work moves forward.</p>
        </div>
        <div className="chat-context-grid" aria-label="Sources used for the answer">
          <div><ShieldCheck size={14} aria-hidden /><span><strong>Approvals</strong><small>Human review</small></span></div>
          <div><Workflow size={14} aria-hidden /><span><strong>Active work</strong><small>Moving</small></span></div>
          <div><Database size={14} aria-hidden /><span><strong>Context</strong><small>Workspace</small></span></div>
        </div>
      </div>
    </div>
  )
}

const DATA_NODES: Array<{ label: string; detail: string; position: string; icon: LucideIcon }> = [
  { label: "Clients", detail: "Ownership", position: "top-left", icon: PanelsTopLeft },
  { label: "Projects", detail: "Current state", position: "top-right", icon: Workflow },
  { label: "Documents", detail: "Source context", position: "bottom-left", icon: FileCheck2 },
  { label: "Decisions", detail: "Approved history", position: "bottom-right", icon: ShieldCheck },
]

function DataDemo() {
  return (
    <div className="platform-demo data-demo" aria-label="Connected business data">
      <div className="platform-demo-toolbar">
        <div><strong>Connected business memory</strong><span>Structured records, not a generic document dump</span></div>
        <span className="platform-demo-state"><i aria-hidden />Traceable</span>
      </div>

      <div className="data-demo-map">
        <svg className="data-demo-links" viewBox="0 0 800 310" preserveAspectRatio="none" aria-hidden>
          <path d="M170 67 C285 68 290 154 400 154" pathLength="1" />
          <path d="M630 67 C515 68 510 154 400 154" pathLength="1" />
          <path d="M170 244 C285 242 290 154 400 154" pathLength="1" />
          <path d="M630 244 C515 242 510 154 400 154" pathLength="1" />
        </svg>
        {DATA_NODES.map((node, index) => {
          const Icon = node.icon
          return (
            <div className={`data-demo-node is-${node.position}`} key={node.label} style={{ "--demo-delay": `${index * 110}ms` } as DelayStyle}>
              <Icon size={15} aria-hidden />
              <span><strong>{node.label}</strong><small>{node.detail}</small></span>
            </div>
          )
        })}
        <div className="data-demo-core">
          <span><Database size={19} aria-hidden /></span>
          <strong>Business memory</strong>
          <small>One operational context</small>
        </div>
        <p className="data-demo-caption">Every approved change updates the same shared context.</p>
      </div>
    </div>
  )
}

function ActiveDemo({ id }: { id: PlatformTabId }) {
  if (id === "chat") return <ChatDemo />
  if (id === "data") return <DataDemo />
  return <PortalDemo />
}

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
    setActiveId(PLATFORM_TABS[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div className="platform-os" aria-label="Interactive client delivery platform">
      <div className="platform-os-glow" aria-hidden />
      <header className="platform-os-header">
        <p className="platform-os-heading">Client Delivery Platform</p>
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

        <div className="platform-os-main" id={`platform-panel-${active.id}`} role="tabpanel" aria-labelledby={`platform-tab-${active.id}`} tabIndex={0}>
          <div className="platform-os-title-row">
            <strong>{active.title}</strong>
            <p>{active.description}</p>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              className="platform-demo-transition"
              key={active.id}
              initial={reduceMotion ? false : { opacity: 0, y: 7, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -5, filter: "blur(2px)" }}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <ActiveDemo id={active.id} />
            </m.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
