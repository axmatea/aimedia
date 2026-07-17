"use client"

/**
 * Lazy client islands (v7.2): the heavy below-fold widgets, dynamically
 * imported with ssr:false exactly as they were in the old client page.
 * next/dynamic with ssr:false must live inside a client module, so the
 * server page shell imports these wrappers instead. Loading placeholders
 * are unchanged.
 */

import dynamic from "next/dynamic"

export const N8nWorkflowBlock = dynamic(
  () => import("@/components/ui/n8n-workflow-block-shadcnui").then((mod) => mod.N8nWorkflowBlock),
  { ssr: false, loading: () => <div className="h-[460px] rounded-2xl animate-pulse bg-white/[0.02] border border-white/5" /> }
)

export const AIUGCCreators = dynamic(
  () => import("@/components/ui/animated-tooltip").then((mod) => mod.AIUGCCreators),
  { ssr: false }
)

export const AgentRadial = dynamic(
  () => import("@/components/ui/agent-radial").then((mod) => mod.AgentRadial),
  { ssr: false, loading: () => <div className="h-[320px] rounded-xl animate-pulse bg-white/[0.02]" /> }
)

export const LeadFunnel = dynamic(
  () => import("@/components/ui/lead-funnel").then((mod) => mod.LeadFunnel),
  { ssr: false, loading: () => <div className="h-[400px] rounded-2xl animate-pulse bg-white/[0.02] border border-white/5" /> }
)

export const WorldMap = dynamic(
  () => import("@/components/ui/map").then((mod) => mod.WorldMap),
  { ssr: false, loading: () => <div className="h-[420px] rounded-xl animate-pulse bg-white/[0.02]" /> }
)
