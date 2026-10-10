"use client"

import { useEffect, useState } from "react"
import s from "./preview.module.css"

const workflows = [
  { label: "Pipeline", input: "New inbound inquiry", detail: "Context captured from your website", stages: ["Capture signal", "Research context", "Prepare handoff", "Ready for review"], output: "A clear next step. In your CRM.", code: "pipeline.inbound" },
  { label: "Content", input: "An approved direction", detail: "Positioning, audience and channel brief", stages: ["Read the brief", "Develop ideas", "Prepare creative", "Ready for review"], output: "Channel-ready work. In your review queue.", code: "content.production" },
  { label: "Operations", input: "A new client project", detail: "Scope, context and delivery requirements", stages: ["Capture context", "Organize work", "Prepare workspace", "Ready for review"], output: "A connected workspace. For your team.", code: "operations.delivery" },
]

export function WorkflowDemo() {
  const [selected, setSelected] = useState(0)
  const [step, setStep] = useState(-1)
  const [running, setRunning] = useState(false)
  const workflow = workflows[selected]
  const complete = step === workflow.stages.length

  useEffect(() => {
    if (!running) return
    // User-triggered, bounded demo. Nothing is submitted or sent to integrations.
    const timer = window.setTimeout(() => {
      if (document.hidden) { setRunning(false); return }
      if (step >= workflow.stages.length - 1) {
        setStep(workflow.stages.length)
        setRunning(false)
      } else setStep((value) => value + 1)
    }, 720)
    return () => window.clearTimeout(timer)
  }, [running, step, workflow.stages.length])

  function run() {
    if (running) { setRunning(false); setStep(-1); return }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(workflow.stages.length)
      return
    }
    setStep(0)
    setRunning(true)
  }

  return (
    <div className={s.demo} aria-label="Interactive example of an AI business workflow">
      <div className={s.demoHeader}><span className={s.demoBrand}><span aria-hidden="true">⌘</span> SYSTEM OVERVIEW</span><span className={s.demoBadge}>ILLUSTRATIVE DEMO</span></div>
      <div className={s.demoTabs} role="group" aria-label="Choose an example workflow">{workflows.map((item, index) => <button key={item.label} type="button" aria-pressed={selected === index} onClick={() => { setSelected(index); setStep(-1); setRunning(false) }}>{item.label}</button>)}</div>
      <div className={s.demoCanvas}>
        <div className={s.demoRail} aria-hidden="true"><span>INPUT</span><i /><span>PROCESS</span><i /><span>OUTPUT</span></div>
        <div className={s.demoContent}>
          <div className={s.inputCard}><div className={s.inputIcon} aria-hidden="true">↙</div><div><h2>{workflow.input}</h2><p>{workflow.detail}</p></div><span className={s.signalDot} aria-hidden="true" /></div>
          <div className={s.connector} aria-hidden="true" />
          <div className={s.engine}><div className={s.engineHeader}><span>AX / ORCHESTRATOR</span><span aria-hidden="true">✳</span></div><ol>{workflow.stages.map((label, index) => <li key={label} className={`${index < step ? s.stepDone : ""} ${index === step ? s.stepActive : ""}`}><span className={s.stepIcon} aria-hidden="true">{index < step ? "✓" : String(index + 1).padStart(2, "0")}</span><span>{label}</span><span className={s.stepState}>{index < step ? "Done" : index === step ? "Running" : "Queued"}</span></li>)}</ol></div>
          <div className={s.connector} aria-hidden="true" />
          <div className={`${s.outputCard} ${complete ? s.outputComplete : ""}`}><span className={s.approvalIcon} aria-hidden="true">↗</span><div><span>HUMAN APPROVAL</span><p>{workflow.output}</p></div></div>
        </div>
      </div>
      <div className={s.demoFooter}><span>{workflow.code}</span><button type="button" onClick={run}>{running ? "Reset demo" : complete ? "Run again" : "Run workflow"}<span aria-hidden="true">{running ? "↺" : "▷"}</span></button></div>
      <span className={s.srOnly} role="status">{complete ? `${workflow.label} example complete. Work is ready for human review. No external action was taken.` : ""}</span>
    </div>
  )
}
