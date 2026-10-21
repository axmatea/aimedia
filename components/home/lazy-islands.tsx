"use client"

/**
 * Lazy client islands (v7.2): the heavy below-fold widgets, dynamically
 * imported with ssr:false exactly as they were in the old client page.
 * next/dynamic with ssr:false must live inside a client module, so the
 * server page shell imports these wrappers instead. Loading placeholders
 * are unchanged.
 */

import dynamic from "next/dynamic"
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react"

const LazyN8nWorkflowBlock = dynamic(
  () => import("@/components/ui/n8n-workflow-block-shadcnui").then((mod) => mod.N8nWorkflowBlock),
  { ssr: false, loading: () => <div className="h-[460px] rounded-2xl animate-pulse bg-white/[0.02] border border-white/5" /> }
)

const LazyAIUGCCreators = dynamic(
  () => import("@/components/ui/animated-tooltip").then((mod) => mod.AIUGCCreators),
  { ssr: false }
)

const LazyAgentRadial = dynamic(
  () => import("@/components/ui/agent-radial").then((mod) => mod.AgentRadial),
  { ssr: false, loading: () => <div className="h-[320px] rounded-xl animate-pulse bg-white/[0.02]" /> }
)

const LazyLeadFunnel = dynamic(
  () => import("@/components/ui/lead-funnel").then((mod) => mod.LeadFunnel),
  { ssr: false, loading: () => <div className="h-[400px] rounded-2xl animate-pulse bg-white/[0.02] border border-white/5" /> }
)

const LazyWorldMap = dynamic(
  () => import("@/components/ui/map").then((mod) => mod.WorldMap),
  { ssr: false, loading: () => <div className="h-[420px] rounded-xl animate-pulse bg-white/[0.02]" /> }
)

/** A split chunk is not deferred if it mounts at page load. Wait until the
 * actual widget approaches, and retain it after mounting so tabs/state survive. */
function DeferredIsland({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (!("IntersectionObserver" in window)) {
      let cancelled = false
      queueMicrotask(() => { if (!cancelled) setReady(true) })
      return () => { cancelled = true }
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setReady(true)
      observer.disconnect()
    }, { rootMargin: "320px" })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className="w-full min-w-0">{ready ? children : fallback}</div>
}

export function N8nWorkflowBlock() {
  return <DeferredIsland fallback={<div className="h-[460px] rounded-2xl bg-white/[0.02] border border-white/5" aria-hidden />}><LazyN8nWorkflowBlock /></DeferredIsland>
}

export function AIUGCCreators() {
  return <DeferredIsland fallback={<div className="h-[90px]" aria-hidden />}><LazyAIUGCCreators /></DeferredIsland>
}

export function AgentRadial() {
  return <DeferredIsland fallback={<div className="agent-system" aria-hidden><div className="agent-orbit-stage" /></div>}><LazyAgentRadial /></DeferredIsland>
}

export function LeadFunnel() {
  return <DeferredIsland fallback={<div className="h-[480px] rounded-3xl bg-[#0A0518]" aria-hidden />}><LazyLeadFunnel /></DeferredIsland>
}

export function WorldMap(props: ComponentProps<typeof LazyWorldMap>) {
  return <DeferredIsland fallback={<div className="aspect-[2/1]" aria-hidden />}><LazyWorldMap {...props} /></DeferredIsland>
}
