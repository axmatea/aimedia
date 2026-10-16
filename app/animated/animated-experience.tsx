"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, BrainCircuit, Layers3, Search, Workflow, type LucideIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"

import { AxWordmark } from "@/components/ui/ax-wordmark"
import { trackFunnel } from "@/lib/conversion/track"

import styles from "./animated-experience.module.css"

const MEDIA = {
  entityPoster: "/animated/posters/entity.webp",
  workflowPoster: "/animated/posters/workflow.webp",
  entity: {
    desktop: "/animated/video/desktop/entity-through-core.mp4",
    mobile: "/animated/video/mobile/entity-through-core.mp4",
  },
  workflow: {
    desktop: "/animated/video/desktop/orchestration-to-workflow.mp4",
    mobile: "/animated/video/mobile/orchestration-to-workflow.mp4",
  },
} as const

const NODES: Array<{ agent: string; action: string; icon: LucideIcon }> = [
  { agent: "Research", action: "UNDERSTAND", icon: Search },
  { agent: "Strategy", action: "ROUTE", icon: BrainCircuit },
  { agent: "Content", action: "COORDINATE", icon: Layers3 },
  { agent: "Delivery", action: "ACT", icon: Workflow },
]

// Operational states of the same nodes, without invented customer data.
const SYSTEMS = [
  {
    name: "Go to market",
    nodes: [["Research", "Public signals"], ["Qualify", "Audience fit"], ["Approve", "Human review"], ["Activate", "Relevant outreach"]],
  },
  {
    name: "Content system",
    nodes: [["Research", "Source material"], ["Create", "Brand context"], ["Review", "Editorial control"], ["Distribute", "Connected channels"]],
  },
  {
    name: "Client platform",
    nodes: [["Portal", "Client delivery"], ["AI Chat", "Shared context"], ["Data layer", "Connected records"], ["Automate", "Workflow execution"]],
  },
] as const

type Variables = CSSProperties & Record<`--${string}`, number | string>
type Point = readonly [number, number]

const ORBIT: readonly Point[] = [[18, 50], [50, 17], [82, 50], [50, 83]]
const FLOW: readonly Point[] = [[12, 50], [37.33, 50], [62.67, 50], [88, 50]]
const PLATFORM: readonly Point[] = [[25, 25], [75, 25], [25, 75], [75, 75]]
const clamp = (value: number) => Math.min(1, Math.max(0, value))
const mix = (start: number, end: number, value: number) => start + (end - start) * value

function smooth(value: number, start: number, end: number) {
  const progress = clamp((value - start) / Math.max(0.001, end - start))
  return progress * progress * (3 - 2 * progress)
}

function phase(value: number, start: number, ready: number, leave: number, end: number) {
  return smooth(value, start, ready) * (1 - smooth(value, leave, end))
}

function progressOf(story: HTMLElement | null) {
  if (!story) return 0
  const rect = story.getBoundingClientRect()
  return clamp(-rect.top / Math.max(1, rect.height - window.innerHeight))
}

export function AnimatedExperience() {
  const storyRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const finalRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Array<HTMLDivElement | null>>([])
  const pathRefs = useRef<Array<SVGPathElement | null>>([])
  const signalRefs = useRef<Array<SVGCircleElement | null>>([])
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([])
  const durations = useRef([0, 0])
  const target = useRef(0)
  const current = useRef(0)
  const frame = useRef<number | null>(null)
  const lastFrame = useRef(0)
  const visible = useRef(true)
  const workflowRequested = useRef(false)
  const finalVisible = useRef(false)

  const [reducedMotion, setReducedMotion] = useState(false)
  const [preferenceReady, setPreferenceReady] = useState(false)
  const [workflowRequestedState, setWorkflowRequested] = useState(false)
  const [mediaReady, setMediaReady] = useState([false, false])
  const [mediaFailed, setMediaFailed] = useState([false, false])

  const paint = useCallback((progress: number) => {
    const stage = stageRef.current
    if (!stage) return

    const unfold = smooth(progress, 0.48, 0.61)
    const expand = smooth(progress, 0.635, 0.725)
    const resolve = smooth(progress, 0.92, 0.99)
    const system = smooth(progress, 0.66, 0.715)
    const orbitMotion = reducedMotion ? 0 : Math.sin(progress * Math.PI * 3) * (1 - unfold) * 2.5
    const values: Record<string, number> = {
      "story-progress": progress,
      "entity-opacity": 1 - smooth(progress, 0.245, 0.32),
      "bridge-opacity": phase(progress, 0.24, 0.3, 0.365, 0.46),
      "graph-opacity": smooth(progress, 0.37, 0.46) * (1 - resolve),
      "agent-opacity": 1 - smooth(progress, 0.475, 0.515),
      "action-opacity": phase(progress, 0.515, 0.56, 0.615, 0.655),
      "system-opacity": system,
      "core-opacity": 1 - unfold * (1 - expand) * 0.94,
      "platform-progress": expand,
      "resolve-progress": resolve,
      "final-opacity": smooth(progress, 0.945, 0.99),
      "state-0": 1 - smooth(progress, 0.755, 0.8),
      "state-1": phase(progress, 0.755, 0.8, 0.84, 0.885),
      "state-2": smooth(progress, 0.84, 0.885),
    }
    Object.entries(values).forEach(([name, value]) => stage.style.setProperty(`--${name}`, value.toFixed(5)))

    const points = NODES.map((_, index) => {
      const orbit = ORBIT[index]
      const flow = FLOW[index]
      const platform = PLATFORM[index]
      const x = reducedMotion ? platform[0] : mix(mix(orbit[0], flow[0], unfold), platform[0], expand)
      const y = reducedMotion ? platform[1] : mix(mix(orbit[1] + (index % 2 ? -orbitMotion : orbitMotion), flow[1], unfold), platform[1], expand)
      const node = nodeRefs.current[index]
      node?.style.setProperty("--node-x", `${x.toFixed(3)}%`)
      node?.style.setProperty("--node-y", `${y.toFixed(3)}%`)
      node?.style.setProperty("--node-active", smooth(progress, 0.4 + index * 0.035, 0.49 + index * 0.035).toFixed(4))
      return [x, y] as const
    })

    points.forEach((point, index) => {
      const previous = points[Math.max(0, index - 1)]
      // Hub -> ordered workflow -> connected platform, using the same paths.
      const hub = reducedMotion ? 1 : 1 - unfold * (1 - expand)
      const fromX = mix(previous[0], 50, hub)
      const fromY = mix(previous[1], 50, hub)
      pathRefs.current[index]?.setAttribute("d", `M ${fromX} ${fromY} L ${point[0]} ${point[1]}`)
      const pulse = (progress * 7 + index * 0.23) % 1
      const signal = signalRefs.current[index]
      signal?.setAttribute("cx", mix(fromX, point[0], reducedMotion ? 0.55 : pulse).toFixed(3))
      signal?.setAttribute("cy", mix(fromY, point[1], reducedMotion ? 0.55 : pulse).toFixed(3))
    })

    const nextFinalVisible = progress >= 0.96
    if (finalRef.current && finalVisible.current !== nextFinalVisible) {
      finalRef.current.inert = !nextFinalVisible
      finalRef.current.setAttribute("aria-hidden", String(!nextFinalVisible))
      finalVisible.current = nextFinalVisible
    }
  }, [reducedMotion])

  const seekVideos = useCallback((progress: number) => {
    // Forward, reverse and keyboard scrolling share exact paused-video targets.
    const positions = [smooth(progress, 0, 0.32), smooth(progress, 0.24, 0.445)]
    videoRefs.current.forEach((video, index) => {
      const duration = durations.current[index]
      if (!video || !duration || video.readyState < 1 || video.seeking) return
      const time = positions[index] * Math.max(0, duration - 0.04)
      if (Math.abs(video.currentTime - time) > 1 / 30) video.currentTime = time
    })
  }, [])

  const startFrame = useCallback(() => {
    if (frame.current !== null || !visible.current) return
    const tick = (timestamp: number) => {
      frame.current = null
      if (!visible.current) return
      const elapsed = lastFrame.current ? Math.min(0.05, (timestamp - lastFrame.current) / 1000) : 1 / 60
      lastFrame.current = timestamp
      const distance = target.current - current.current
      const response = 19 + Math.min(12, Math.abs(distance) * 70)
      current.current = reducedMotion || Math.abs(distance) < 0.00025
        ? target.current
        : current.current + distance * (1 - Math.exp(-response * elapsed))
      paint(current.current)
      if (!reducedMotion) seekVideos(current.current)
      if (Math.abs(target.current - current.current) > 0.00025) {
        frame.current = requestAnimationFrame(tick)
      } else {
        lastFrame.current = 0
      }
    }
    frame.current = requestAnimationFrame(tick)
  }, [paint, reducedMotion, seekVideos])

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => {
      setReducedMotion(preference.matches)
      setPreferenceReady(true)
    }
    sync()
    preference.addEventListener("change", sync)
    return () => preference.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    const videos = videoRefs.current
    const update = () => {
      target.current = progressOf(storyRef.current)
      if (target.current >= 0.17 && !workflowRequested.current) {
        workflowRequested.current = true
        setWorkflowRequested(true)
      }
      startFrame()
    }
    const onVisibility = () => {
      visible.current = !document.hidden
      videos.forEach((video) => video?.pause())
      if (!visible.current && frame.current !== null) {
        cancelAnimationFrame(frame.current)
        frame.current = null
      } else if (visible.current) {
        lastFrame.current = 0
        update()
      }
    }
    finalRef.current?.setAttribute("aria-hidden", "true")
    if (finalRef.current) finalRef.current.inert = true
    finalVisible.current = false
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update, { passive: true })
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      document.removeEventListener("visibilitychange", onVisibility)
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
      videos.forEach((video) => video?.pause())
    }
  }, [startFrame])

  const onMetadata = (index: number) => {
    const video = videoRefs.current[index]
    if (!video || !Number.isFinite(video.duration)) return
    durations.current[index] = video.duration
    startFrame()
  }

  const skipToActions = () => {
    const story = storyRef.current
    if (!story) return
    window.scrollTo({
      top: window.scrollY + story.getBoundingClientRect().top + story.offsetHeight - window.innerHeight,
      behavior: "instant",
    })
    target.current = 1
    current.current = 1
    paint(1)
    finalVisible.current = true
    if (finalRef.current) {
      finalRef.current.inert = false
      finalRef.current.setAttribute("aria-hidden", "false")
      finalRef.current.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true })
    }
  }

  return (
    <main className={`${styles.experience} ${reducedMotion ? styles.reducedMotion : ""}`}>
      <h1 className={styles.srOnly}>AX Media Animated Experience</h1>
      <button type="button" className={styles.skipLink} onClick={skipToActions}>Skip to actions</button>
      <section ref={storyRef} className={styles.story} aria-label="An AI entity becomes a coordinated business system">
        <div ref={stageRef} className={styles.stage}>
          <header className={styles.header}>
            <Link href="/" aria-label="AX Media home" className={styles.brandLink}><AxWordmark className={styles.wordmark} /></Link>
            <span className={styles.progressTrack} aria-hidden><i /></span>
            <Link href="/" className={styles.returnLink}>Return to Standard Site <ArrowUpRight aria-hidden /></Link>
          </header>

          <div className={styles.world} aria-hidden>
            <div className={`${styles.mediaLayer} ${styles.entityLayer}`}>
              <Image src={MEDIA.entityPoster} alt="" fill priority sizes="100vw" className={styles.media} />
              {preferenceReady && !reducedMotion && (
                <video
                  ref={(video) => { videoRefs.current[0] = video }}
                  className={`${styles.media} ${styles.video} ${mediaReady[0] && !mediaFailed[0] ? styles.mediaReady : ""}`}
                  muted playsInline preload="metadata" disablePictureInPicture
                  onLoadedMetadata={() => onMetadata(0)} onSeeked={startFrame}
                  onLoadedData={() => setMediaReady((value) => [true, value[1]])}
                  onError={(event) => {
                    event.currentTarget.dataset.mediaError = String(event.currentTarget.error?.code ?? "source")
                    setMediaFailed((value) => [true, value[1]])
                  }}
                >
                  <source media="(max-width: 700px)" src={MEDIA.entity.mobile} type="video/mp4" />
                  <source src={MEDIA.entity.desktop} type="video/mp4" />
                </video>
              )}
            </div>
            <div className={`${styles.mediaLayer} ${styles.bridgeLayer}`}>
              {workflowRequestedState && <Image src={MEDIA.workflowPoster} alt="" fill sizes="100vw" className={styles.media} />}
              {workflowRequestedState && preferenceReady && !reducedMotion && (
                <video
                  ref={(video) => { videoRefs.current[1] = video }}
                  className={`${styles.media} ${styles.video} ${mediaReady[1] && !mediaFailed[1] ? styles.mediaReady : ""}`}
                  muted playsInline preload="metadata" disablePictureInPicture
                  onLoadedMetadata={() => onMetadata(1)} onSeeked={startFrame}
                  onLoadedData={() => setMediaReady((value) => [value[0], true])}
                  onError={(event) => {
                    event.currentTarget.dataset.mediaError = String(event.currentTarget.error?.code ?? "source")
                    setMediaFailed((value) => [value[0], true])
                  }}
                >
                  <source media="(max-width: 700px)" src={MEDIA.workflow.mobile} type="video/mp4" />
                  <source src={MEDIA.workflow.desktop} type="video/mp4" />
                </video>
              )}
            </div>
            <div className={styles.atmosphere} />
          </div>

          <div className={styles.graph} role="img" aria-label="Research, strategy, content, and delivery agents coordinate through an orchestrator, then form go-to-market, content, and client-platform workflows.">
            <svg className={styles.connections} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              {NODES.map((node, index) => (
                <g key={node.agent}>
                  <path ref={(path) => { pathRefs.current[index] = path }} d={`M 50 50 L ${ORBIT[index][0]} ${ORBIT[index][1]}`} />
                  <circle ref={(signal) => { signalRefs.current[index] = signal }} cx="50" cy="50" r="0.24" />
                </g>
              ))}
            </svg>
            <div className={styles.orchestrator}>
              <span className={styles.core} aria-hidden><i /></span>
              <span className={styles.coreLabel}>Orchestrator</span>
            </div>
            {NODES.map((node, index) => {
              const Icon = node.icon
              return (
                <div
                  key={node.agent}
                  ref={(element) => { nodeRefs.current[index] = element }}
                  className={styles.node}
                  style={{ "--node-x": `${ORBIT[index][0]}%`, "--node-y": `${ORBIT[index][1]}%` } as Variables}
                  aria-hidden
                >
                  <div className={styles.nodeSurface} />
                  <span className={styles.nodeGlyph}><Icon /></span>
                  <span className={styles.agentLabel}>{node.agent}</span>
                  <span className={styles.actionLabel}>{node.action}</span>
                  <div className={styles.operationalLabels}>
                    {SYSTEMS.map((system, systemIndex) => (
                      <span key={system.name} className={styles.operationalLabel} style={{ "--state-opacity": `var(--state-${systemIndex})` } as Variables}>
                        <strong>{system.nodes[index][0]}</strong>
                        <small>{system.nodes[index][1]}</small>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className={styles.systemLabels} aria-hidden>
            {SYSTEMS.map((system, index) => <span key={system.name} style={{ "--state-opacity": `var(--state-${index})` } as Variables}>{system.name}</span>)}
          </div>

          <div ref={finalRef} className={styles.finalActions} inert aria-hidden="true">
            <span className={styles.resolvedCore} aria-hidden />
            <Link href="/#booking" className={styles.primaryAction} onClick={() => trackFunnel("primary_cta_clicked")}>
              Book a Call <ArrowUpRight aria-hidden />
            </Link>
            <Link href="/systems/qualified-pipeline" className={styles.secondaryAction}>View Selected Systems <ArrowUpRight aria-hidden /></Link>
            <Link href="/" className={styles.standardAction}>Return to Standard Site</Link>
          </div>

          {!reducedMotion && preferenceReady && !mediaReady[0] && !mediaFailed[0] && (
            <div className={styles.loading} role="status"><i />Preparing the system</div>
          )}
          <span className={styles.scrollCue} aria-hidden>Scroll to explore <i /></span>
        </div>
      </section>
    </main>
  )
}
