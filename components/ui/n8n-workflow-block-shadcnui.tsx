"use client"
import { motion, type PanInfo } from "framer-motion"
import type React from "react"
import { useRef, useState } from "react"
import { flushSync } from "react-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Globe, Users, Mail, BarChart3, Plus, Zap, Search, Database } from "lucide-react"

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

const NODE_WIDTH = 210
const NODE_HEIGHT = 100

const colorClasses: Record<string, string> = {
  purple: "border-purple-400/40 bg-purple-400/10 text-purple-400",
  red: "border-red-400/40 bg-red-400/10 text-red-400",
  lime: "border-lime-400/40 bg-lime-400/10 text-lime-400",
  cyan: "border-cyan-400/40 bg-cyan-400/10 text-cyan-400",
  orange: "border-orange-400/40 bg-orange-400/10 text-orange-400",
  blue: "border-blue-400/40 bg-blue-400/10 text-blue-400",
}

const initialNodes: WorkflowNode[] = [
  { id: "n1", type: "trigger", title: "Target ICP", description: "Define ideal customer profile", icon: Search, color: "purple", position: { x: 30, y: 60 } },
  { id: "n2", type: "action", title: "Scrape Google Maps", description: "Find matching businesses", icon: Globe, color: "blue", position: { x: 290, y: 60 } },
  { id: "n3", type: "action", title: "Enrich Leads", description: "Add emails, phone, LinkedIn", icon: Database, color: "cyan", position: { x: 550, y: 60 } },
  { id: "n4", type: "condition", title: "Qualify & Score", description: "AI classifies fit via Claude", icon: Zap, color: "lime", position: { x: 290, y: 210 } },
  { id: "n5", type: "action", title: "Launch Outreach", description: "Personalized cold email sequences", icon: Mail, color: "red", position: { x: 550, y: 210 } },
  { id: "n6", type: "action", title: "Track & Optimize", description: "Monitor replies, book calls", icon: BarChart3, color: "orange", position: { x: 420, y: 360 } },
]

const initialConnections: WorkflowConnection[] = [
  { from: "n1", to: "n2" },
  { from: "n2", to: "n3" },
  { from: "n3", to: "n4" },
  { from: "n4", to: "n5" },
  { from: "n5", to: "n6" },
]

function ConnectionLine({ from, to, nodes }: { from: string; to: string; nodes: WorkflowNode[] }) {
  const fromNode = nodes.find((n) => n.id === from)
  const toNode = nodes.find((n) => n.id === to)
  if (!fromNode || !toNode) return null
  const startX = fromNode.position.x + NODE_WIDTH
  const startY = fromNode.position.y + NODE_HEIGHT / 2
  const endX = toNode.position.x
  const endY = toNode.position.y + NODE_HEIGHT / 2
  const cp1X = startX + (endX - startX) * 0.5
  const cp2X = endX - (endX - startX) * 0.5
  const path = `M${startX},${startY} C${cp1X},${startY} ${cp2X},${endY} ${endX},${endY}`
  return (
    <path d={path} fill="none" stroke="#FF2D55" strokeWidth={1.5}
      strokeDasharray="6,5" strokeLinecap="round" opacity={0.4} />
  )
}

export function N8nWorkflowBlock() {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes)
  const [connections] = useState<WorkflowConnection[]>(initialConnections)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [contentSize, setContentSize] = useState(() => ({
    width: Math.max(...initialNodes.map((n) => n.position.x + NODE_WIDTH)) + 60,
    height: Math.max(...initialNodes.map((n) => n.position.y + NODE_HEIGHT)) + 60,
  }))

  const handleDragStart = (nodeId: string) => {
    setDraggingNodeId(nodeId)
    const node = nodes.find((n) => n.id === nodeId)
    if (node) dragStartPosition.current = { x: node.position.x, y: node.position.y }
  }

  const handleDrag = (nodeId: string, { offset }: PanInfo) => {
    if (draggingNodeId !== nodeId || !dragStartPosition.current) return
    const x = Math.max(0, dragStartPosition.current.x + offset.x)
    const y = Math.max(0, dragStartPosition.current.y + offset.y)
    flushSync(() => {
      setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, position: { x, y } } : n))
    })
    setContentSize((prev) => ({
      width: Math.max(prev.width, x + NODE_WIDTH + 60),
      height: Math.max(prev.height, y + NODE_HEIGHT + 60),
    }))
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/8 bg-black/40 backdrop-blur p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="rounded-full border-[#C8FF60]/40 bg-[#C8FF60]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C8FF60]">
            Live
          </Badge>
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">Go-To-Market Pipeline</span>
        </div>
        <span className="text-[10px] text-white/20 font-mono">Drag nodes to explore</span>
      </div>

      <div ref={canvasRef} className="relative overflow-auto rounded-xl border border-white/6 bg-[#050507]/60" style={{ height: 460 }}>
        <div className="relative" style={{ minWidth: contentSize.width, minHeight: contentSize.height }}>
          <svg className="absolute top-0 left-0 pointer-events-none" width={contentSize.width} height={contentSize.height} style={{ overflow: "visible" }}>
            {connections.map((c) => (
              <ConnectionLine key={`${c.from}-${c.to}`} from={c.from} to={c.to} nodes={nodes} />
            ))}
          </svg>

          {nodes.map((node) => {
            const Icon = node.icon
            const isDragging = draggingNodeId === node.id
            return (
              <motion.div key={node.id} drag dragMomentum={false}
                dragConstraints={{ left: 0, top: 0, right: 100000, bottom: 100000 }}
                onDragStart={() => handleDragStart(node.id)}
                onDrag={(_, info) => handleDrag(node.id, info)}
                onDragEnd={() => { setDraggingNodeId(null); dragStartPosition.current = null }}
                style={{ x: node.position.x, y: node.position.y, width: NODE_WIDTH, position: "absolute" }}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
                whileHover={{ scale: 1.03 }}
                whileDrag={{ scale: 1.06, zIndex: 50 }}
              >
                <Card className={`group/node relative w-full overflow-hidden rounded-xl border ${colorClasses[node.color]} bg-[#0C0C0F]/90 p-3 cursor-grab ${isDragging ? "cursor-grabbing shadow-xl ring-1 ring-[#FF2D55]/40" : ""}`}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${colorClasses[node.color]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <Badge variant="outline" className="mb-0.5 rounded-full border-white/10 bg-white/5 px-1.5 py-0 text-[9px] uppercase tracking-[0.15em] text-white/40">
                          {node.type}
                        </Badge>
                        <p className="text-xs font-bold text-white/85 leading-tight">{node.title}</p>
                      </div>
                    </div>
                    <p className="text-[10px] leading-relaxed text-white/45">{node.description}</p>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

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
