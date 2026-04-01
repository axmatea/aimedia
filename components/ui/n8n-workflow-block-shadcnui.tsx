"use client"
import { motion, type PanInfo } from "framer-motion"
import type React from "react"
import { useRef, useState } from "react"
import { flushSync } from "react-dom"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Search, Database, Zap, Mail } from "lucide-react"

interface WorkflowNode {
  id: string
  type: "trigger" | "action" | "condition"
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  position: { x: number; y: number }
}

interface WorkflowConnection {
  from: string
  to: string
}

const NODE_W = 150
const NODE_H = 80

const colors: Record<string, string> = {
  purple: "border-purple-400/40 bg-purple-400/10 text-purple-400",
  cyan: "border-cyan-400/40 bg-cyan-400/10 text-cyan-400",
  lime: "border-lime-400/40 bg-lime-400/10 text-lime-400",
  red: "border-red-400/40 bg-red-400/10 text-red-400",
}

// Diamond layout: top → split left/right → converge bottom
//       [Target ICP]
//        ↙         ↘
// [Enrich]       [Qualify]
//        ↘         ↙
//     [Outreach]
const initialNodes: WorkflowNode[] = [
  { id: "n1", type: "trigger",   title: "Target ICP",       description: "Define ideal customer",     icon: Search,   color: "purple", position: { x: 80,  y: 10  } },
  { id: "n2", type: "action",    title: "Enrich Leads",     description: "Emails, phone, LinkedIn",   icon: Database, color: "cyan",   position: { x: 0,   y: 120 } },
  { id: "n3", type: "condition", title: "Qualify & Score",  description: "AI classifies via Claude",  icon: Zap,      color: "lime",   position: { x: 160, y: 120 } },
  { id: "n4", type: "action",    title: "Launch Outreach",  description: "Personalized sequences",    icon: Mail,     color: "red",    position: { x: 80,  y: 230 } },
]

const initialConnections: WorkflowConnection[] = [
  { from: "n1", to: "n2" },
  { from: "n1", to: "n3" },
  { from: "n2", to: "n4" },
  { from: "n3", to: "n4" },
]

// Vertical flow: bottom-center of "from" → top-center of "to"
function ConnectionLine({ from, to, nodes }: { from: string; to: string; nodes: WorkflowNode[] }) {
  const f = nodes.find((n) => n.id === from)
  const t = nodes.find((n) => n.id === to)
  if (!f || !t) return null

  const sx = f.position.x + NODE_W / 2
  const sy = f.position.y + NODE_H
  const ex = t.position.x + NODE_W / 2
  const ey = t.position.y

  const midY = (sy + ey) / 2
  const path = `M${sx},${sy} C${sx},${midY} ${ex},${midY} ${ex},${ey}`

  return (
    <>
      <path d={path} fill="none" stroke="url(#conn-grad)" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
      <path d={path} fill="none" stroke="url(#conn-grad)" strokeWidth={1.5} strokeDasharray="5,4" strokeLinecap="round" opacity={0.25} />
      {/* Endpoint dot */}
      <circle cx={ex} cy={ey} r={3} fill="#FF2D55" opacity={0.6} />
    </>
  )
}

export function N8nWorkflowBlock() {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes)
  const [connections] = useState<WorkflowConnection[]>(initialConnections)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [size, setSize] = useState(() => ({
    width: Math.max(...initialNodes.map((n) => n.position.x + NODE_W)) + 30,
    height: Math.max(...initialNodes.map((n) => n.position.y + NODE_H)) + 30,
  }))

  const onDragStart = (id: string) => {
    setDragging(id)
    const n = nodes.find((n) => n.id === id)
    if (n) dragStart.current = { ...n.position }
  }

  const onDrag = (id: string, { offset }: PanInfo) => {
    if (dragging !== id || !dragStart.current) return
    const x = Math.max(0, dragStart.current.x + offset.x)
    const y = Math.max(0, dragStart.current.y + offset.y)
    flushSync(() => setNodes((prev) => prev.map((n) => n.id === id ? { ...n, position: { x, y } } : n)))
    setSize((prev) => ({
      width: Math.max(prev.width, x + NODE_W + 30),
      height: Math.max(prev.height, y + NODE_H + 30),
    }))
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/8 bg-black/40 backdrop-blur p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="rounded-full border-[#C8FF60]/40 bg-[#C8FF60]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C8FF60]">
            Live
          </Badge>
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">Sales Pipeline</span>
        </div>
        <span className="text-[11px] text-white/45 font-medium flex items-center gap-1.5 animate-pulse">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 9l4-4 4 4" /><path d="M15 15l4 4 4-4" />
          </svg>
          Drag to explore
        </span>
      </div>

      {/* Canvas */}
      <div className="relative overflow-hidden rounded-xl border border-white/6 bg-[#050507]/60" style={{ height: 360 }}>
        <div className="relative" style={{ minWidth: size.width, minHeight: size.height }}>
          <svg className="absolute top-0 left-0 pointer-events-none" width={size.width} height={size.height} style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="conn-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FF2D55" />
                <stop offset="100%" stopColor="#7B2FFF" />
              </linearGradient>
            </defs>
            {connections.map((c) => (
              <ConnectionLine key={`${c.from}-${c.to}`} from={c.from} to={c.to} nodes={nodes} />
            ))}
          </svg>

          {nodes.map((node) => {
            const Icon = node.icon
            const active = dragging === node.id
            return (
              <motion.div key={node.id} drag dragMomentum={false}
                dragConstraints={{ left: 0, top: 0, right: 100000, bottom: 100000 }}
                onDragStart={() => onDragStart(node.id)}
                onDrag={(_, info) => onDrag(node.id, info)}
                onDragEnd={() => { setDragging(null); dragStart.current = null }}
                style={{ x: node.position.x, y: node.position.y, width: NODE_W, position: "absolute" }}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.05 * parseInt(node.id.slice(1)) }}
                whileHover={{ scale: 1.04 }}
                whileDrag={{ scale: 1.07, zIndex: 50 }}
              >
                <Card className={`group/node relative w-full overflow-hidden rounded-xl border ${colors[node.color]} bg-[#0C0C0F]/90 p-3 cursor-grab ${active ? "cursor-grabbing shadow-xl ring-1 ring-[#FF2D55]/40" : ""}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${colors[node.color]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white/90 leading-tight truncate">{node.title}</p>
                      <p className="text-[9px] leading-snug text-white/40 mt-0.5 truncate">{node.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between rounded-lg border border-white/6 bg-white/[0.02] px-4 py-2">
        <div className="flex gap-4 text-[10px] text-white/40">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#C8FF60] inline-block" />{nodes.length} Nodes</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#FF2D55] inline-block" />{connections.length} Connections</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#7B2FFF] inline-block" />Running 24/7</span>
        </div>
        <span className="text-[9px] uppercase tracking-[0.2em] text-white/20">Powered by Claude API</span>
      </div>
    </div>
  )
}
