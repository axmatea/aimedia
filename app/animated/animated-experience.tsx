"use client"

import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  Check,
  CircleUserRound,
  Database,
  FileCheck2,
  Layers3,
  Mail,
  Network,
  PanelsTopLeft,
  PenTool,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useRef, useState, type CSSProperties } from "react"

import { AxWordmark } from "@/components/ui/ax-wordmark"

import styles from "./animated-experience.module.css"

const MEDIA = {
  entity: {
    desktop: "/animated/video/desktop/entity-to-core.mp4",
    mobile: "/animated/video/mobile/entity-to-core.mp4",
    poster: "/animated/posters/entity.webp",
  },
  core: {
    desktop: "/animated/video/desktop/core-to-orchestration.mp4",
    mobile: "/animated/video/mobile/core-to-orchestration.mp4",
    poster: "/animated/posters/core.webp",
  },
  workflowTransition: {
    desktop: "/animated/video/desktop/orchestration-to-workflow.mp4",
    mobile: "/animated/video/mobile/orchestration-to-workflow.mp4",
    poster: "/animated/posters/orchestration.webp",
  },
  orchestration: "/animated/posters/orchestration.webp",
  workflow: "/animated/posters/workflow.webp",
} as const

const CHAPTERS = [
  ["scene-entity", "AI Entity"],
  ["scene-core", "Enter Core"],
  ["scene-orchestration", "Orchestration"],
  ["scene-workflow", "Workflow"],
  ["scene-platform", "Platform"],
  ["scene-outcomes", "Outcomes"],
  ["final-cta", "Build"],
] as const

const AGENTS: Array<{ label: string; detail: string; icon: LucideIcon }> = [
  { label: "Research", detail: "Signals and qualification", icon: Search },
  { label: "Content", detail: "Campaigns and assets", icon: PenTool },
  { label: "Analytics", detail: "Reporting and anomalies", icon: BarChart3 },
  { label: "Outreach", detail: "Sequences and routing", icon: Mail },
  { label: "Strategy", detail: "Priorities and review", icon: BrainCircuit },
]

const WORKFLOW_STEPS: Array<{ label: string; detail: string; icon: LucideIcon }> = [
  { label: "Input", detail: "Briefs, data, requests", icon: CircleUserRound },
  { label: "Analysis", detail: "Context and priorities", icon: Search },
  { label: "Specialists", detail: "Right agent, right task", icon: Network },
  { label: "Execution", detail: "Work moves automatically", icon: Workflow },
  { label: "Approval", detail: "Human review where it matters", icon: ShieldCheck },
  { label: "Output", detail: "Visible, measurable delivery", icon: FileCheck2 },
]

const PLATFORM_MODULES: Array<{ label: string; detail: string; icon: LucideIcon }> = [
  { label: "Request intake", detail: "Context, files, ownership", icon: CircleUserRound },
  { label: "AI routing", detail: "Classify, enrich, assign", icon: Bot },
  { label: "Human approval", detail: "Review gates and decisions", icon: ShieldCheck },
  { label: "Client delivery", detail: "Status, outputs, next actions", icon: PanelsTopLeft },
]

const OUTCOMES: Array<{ label: string; detail: string; icon: LucideIcon }> = [
  { label: "AI operations", detail: "Coordinated agents with accountable review.", icon: BrainCircuit },
  { label: "Client platforms", detail: "One clear place for requests, status, and delivery.", icon: PanelsTopLeft },
  { label: "Workflow automation", detail: "Connected work from input through approval.", icon: Workflow },
  { label: "Go-to-market systems", detail: "Research, pipeline, outreach, and reporting.", icon: Network },
  { label: "Content systems", detail: "On-brand production across every active channel.", icon: Layers3 },
]

const clamp = (value: number) => Math.min(1, Math.max(0, value))

type StyleWithVariables = CSSProperties & Record<`--${string}`, string | number>

function progressFor(section: HTMLElement | null) {
  if (!section) return 0
  const rect = section.getBoundingClientRect()
  const travel = Math.max(1, rect.height - window.innerHeight)
  return clamp(-rect.top / travel)
}

export function AnimatedExperience() {
  const sceneRefs = useRef<Array<HTMLElement | null>>([])
  const entityVideoRef = useRef<HTMLVideoElement>(null)
  const coreVideoRef = useRef<HTMLVideoElement>(null)
  const workflowVideoRef = useRef<HTMLVideoElement>(null)
  const durationRef = useRef([0, 0, 0])
  const targetRef = useRef([0, 0, 0])
  const animationFrameRef = useRef<number | null>(null)
  const coreLoadRequestedRef = useRef(false)
  const workflowLoadRequestedRef = useRef(false)
  const pageVisibleRef = useRef(true)
  const currentChapterRef = useRef(0)
  const workflowStepRef = useRef(-1)
  const platformStepRef = useRef(-1)
  const outcomeStepRef = useRef(-1)

  const [activeChapter, setActiveChapter] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [motionPreferenceReady, setMotionPreferenceReady] = useState(false)
  const [videoReady, setVideoReady] = useState([false, false, false])
  const [videoFailed, setVideoFailed] = useState([false, false, false])
  const [workflowStep, setWorkflowStep] = useState(0)
  const [platformStep, setPlatformStep] = useState(0)
  const [outcomeStep, setOutcomeStep] = useState(0)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => {
      setReducedMotion(query.matches)
      setMotionPreferenceReady(true)
    }
    sync()
    query.addEventListener?.("change", sync)
    return () => query.removeEventListener?.("change", sync)
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      pageVisibleRef.current = !document.hidden
      if (document.hidden) {
        entityVideoRef.current?.pause()
        coreVideoRef.current?.pause()
        workflowVideoRef.current?.pause()
        if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      } else {
        window.dispatchEvent(new Event("scroll"))
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  useEffect(() => {
    if (reducedMotion) return

    const renderVideos = () => {
      animationFrameRef.current = null
      if (!pageVisibleRef.current) return

      const videos = [entityVideoRef.current, coreVideoRef.current, workflowVideoRef.current]
      let continueChase = false

      videos.forEach((video, index) => {
        const duration = durationRef.current[index]
        if (!video || duration <= 0 || video.readyState < HTMLMediaElement.HAVE_METADATA) return
        if (video.seeking) {
          continueChase = true
          return
        }

        const target = targetRef.current[index]
        const next = target
        const requestedTime = next * Math.max(0, duration - 0.025)
        if (Math.abs(video.currentTime - requestedTime) > 0.012) {
          video.currentTime = requestedTime
        }
      })

      if (continueChase) animationFrameRef.current = requestAnimationFrame(renderVideos)
    }

    const update = () => {
      if (!pageVisibleRef.current) return

      const progresses = sceneRefs.current.map(progressFor)
      targetRef.current[0] = progresses[0] ?? 0
      targetRef.current[1] = progresses[1] ?? 0
      targetRef.current[2] = progresses[3] ?? 0
      if ((progresses[0] ?? 0) >= 0.55 && !coreLoadRequestedRef.current) {
        coreLoadRequestedRef.current = true
        coreVideoRef.current?.load()
      }
      if ((progresses[1] ?? 0) >= 0.55 && !workflowLoadRequestedRef.current) {
        workflowLoadRequestedRef.current = true
        workflowVideoRef.current?.load()
      }

      sceneRefs.current.forEach((section, index) => {
        const progress = progresses[index] ?? 0
        section?.style.setProperty("--scene-progress", progress.toFixed(4))
      })

      const viewportCenter = window.innerHeight * 0.5
      const chapter = sceneRefs.current.findIndex((section) => {
        if (!section) return false
        const rect = section.getBoundingClientRect()
        return rect.top <= viewportCenter && rect.bottom > viewportCenter
      })
      const resolvedChapter = chapter < 0
        ? (window.scrollY < 10 ? 0 : CHAPTERS.length - 1)
        : chapter
      if (resolvedChapter !== currentChapterRef.current) {
        currentChapterRef.current = resolvedChapter
        setActiveChapter(resolvedChapter)
      }

      const nextWorkflowStep = Math.min(WORKFLOW_STEPS.length - 1, Math.floor((progresses[3] ?? 0) * WORKFLOW_STEPS.length))
      if (nextWorkflowStep !== workflowStepRef.current) {
        workflowStepRef.current = nextWorkflowStep
        setWorkflowStep(nextWorkflowStep)
      }

      const nextPlatformStep = Math.min(PLATFORM_MODULES.length - 1, Math.floor((progresses[4] ?? 0) * PLATFORM_MODULES.length))
      if (nextPlatformStep !== platformStepRef.current) {
        platformStepRef.current = nextPlatformStep
        setPlatformStep(nextPlatformStep)
      }

      const nextOutcomeStep = Math.min(OUTCOMES.length - 1, Math.floor((progresses[5] ?? 0) * OUTCOMES.length))
      if (nextOutcomeStep !== outcomeStepRef.current) {
        outcomeStepRef.current = nextOutcomeStep
        setOutcomeStep(nextOutcomeStep)
      }

      if (animationFrameRef.current === null) {
        animationFrameRef.current = requestAnimationFrame(renderVideos)
      }
    }

    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update, { passive: true })
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [reducedMotion])

  const registerScene = (index: number) => (node: HTMLElement | null) => {
    sceneRefs.current[index] = node
  }

  const onMetadata = (index: number) => {
    const video = [entityVideoRef.current, coreVideoRef.current, workflowVideoRef.current][index]
    if (!video || !Number.isFinite(video.duration)) return
    durationRef.current[index] = video.duration
    const requestedTime = targetRef.current[index] * Math.max(0, video.duration - 0.025)
    video.currentTime = Math.max(0.001, requestedTime)
  }

  const markReady = (index: number) => {
    setVideoReady((current) => current.map((ready, itemIndex) => itemIndex === index ? true : ready))
  }

  const markFailed = (index: number) => {
    setVideoFailed((current) => current.map((failed, itemIndex) => itemIndex === index ? true : failed))
  }

  return (
    <main className={`${styles.experience} ${reducedMotion ? styles.reducedMotion : ""}`}>
      <a href="#final-cta" className={styles.skipLink}>Skip animated story</a>

      <header className={styles.header}>
        <Link href="/" aria-label="AX Media home" className={styles.brandLink}>
          <AxWordmark className={styles.wordmark} />
        </Link>
        <div className={styles.headerChapter} aria-hidden>
          <span>{String(activeChapter + 1).padStart(2, "0")} / 07</span>
          <strong>{CHAPTERS[activeChapter][1]}</strong>
        </div>
        <Link href="/" className={styles.returnLink}>Return to Standard Site</Link>
      </header>

      <nav className={styles.chapterRail} aria-label="Animated experience chapters">
        {CHAPTERS.map(([id, label], index) => (
          <a
            key={id}
            href={`#${id}`}
            className={index === activeChapter ? styles.chapterActive : ""}
            aria-label={`Chapter ${index + 1}: ${label}`}
            aria-current={index === activeChapter ? "step" : undefined}
          >
            <span />
            <small>{label}</small>
          </a>
        ))}
      </nav>

      <section ref={registerScene(0)} id="scene-entity" className={`${styles.scene} ${styles.videoScene}`} aria-labelledby="entity-title">
        <div className={styles.stickyStage}>
          <Image src={MEDIA.entity.poster} alt="" width={1600} height={900} priority sizes="100vw" className={styles.poster} aria-hidden />
          {motionPreferenceReady && !reducedMotion && !videoFailed[0] && (
            <video
              ref={entityVideoRef}
              className={`${styles.sceneVideo} ${videoReady[0] ? styles.mediaReady : ""}`}
              poster={MEDIA.entity.poster}
              width={1280}
              height={720}
              preload="auto"
              muted
              playsInline
              disablePictureInPicture
              aria-hidden
              onLoadedMetadata={() => onMetadata(0)}
              onCanPlay={() => markReady(0)}
              onError={(event) => { if (event.currentTarget.error) markFailed(0) }}
            >
              <source media="(max-width: 700px)" src={MEDIA.entity.mobile} type="video/mp4" />
              <source src={MEDIA.entity.desktop} type="video/mp4" />
            </video>
          )}
          <SceneAtmosphere />
          <div className={`${styles.sceneCopy} ${styles.sceneCopyLower}`}>
            <p className={styles.eyebrow}>01 · AI Entity</p>
            <h1 id="entity-title">Intelligence<br />should feel <em>alive.</em></h1>
            <p>An evolving operating layer with perception, memory, and action moving through one controlled system.</p>
          </div>
          <div className={styles.entityTelemetry} aria-label="AI entity capabilities">
            <span><i />Perception</span>
            <span><i />Memory</span>
            <span><i />Action</span>
          </div>
          {motionPreferenceReady && !reducedMotion && !videoReady[0] && !videoFailed[0] && <MediaLoading label="Initializing entity" />}
          <ScrollCue />
        </div>
      </section>

      <section ref={registerScene(1)} id="scene-core" className={`${styles.scene} ${styles.videoScene}`} aria-labelledby="core-title">
        <div className={styles.stickyStage}>
          <Image src={MEDIA.core.poster} alt="" width={1600} height={900} sizes="100vw" className={styles.poster} aria-hidden />
          {motionPreferenceReady && !reducedMotion && !videoFailed[1] && (
            <video
              ref={coreVideoRef}
              className={`${styles.sceneVideo} ${videoReady[1] ? styles.mediaReady : ""}`}
              poster={MEDIA.core.poster}
              width={1280}
              height={720}
              preload="none"
              muted
              playsInline
              disablePictureInPicture
              aria-hidden
              onLoadedMetadata={() => onMetadata(1)}
              onCanPlay={() => markReady(1)}
              onError={(event) => { if (event.currentTarget.error) markFailed(1) }}
            >
              <source media="(max-width: 700px)" src={MEDIA.core.mobile} type="video/mp4" />
              <source src={MEDIA.core.desktop} type="video/mp4" />
            </video>
          )}
          <SceneAtmosphere />
          <div className={`${styles.sceneCopy} ${styles.sceneCopyUpper}`}>
            <p className={styles.eyebrow}>02 · Enter the Core</p>
            <h2 id="core-title">Signal becomes<br /><em>structure.</em></h2>
            <p>The entity dissolves into one precise routing layer. Every input gains context before anything acts.</p>
          </div>
          <div className={styles.coreReadout} aria-label="Core routing sequence">
            <span>Signals in</span><ArrowRight aria-hidden /><span>Context</span><ArrowRight aria-hidden /><span>Routes out</span>
          </div>
          {motionPreferenceReady && !reducedMotion && !videoReady[1] && !videoFailed[1] && <MediaLoading label="Opening neural gateway" />}
        </div>
      </section>

      <section ref={registerScene(2)} id="scene-orchestration" className={`${styles.scene} ${styles.htmlScene}`} aria-labelledby="orchestration-title">
        <div className={styles.stickyStage}>
          <Image src={MEDIA.orchestration} alt="" width={1600} height={900} sizes="100vw" className={`${styles.poster} ${styles.posterDim}`} aria-hidden />
          <SceneAtmosphere />
          <div className={`${styles.sceneCopy} ${styles.compactCopy}`}>
            <p className={styles.eyebrow}>03 · Orchestration System</p>
            <h2 id="orchestration-title">One core.<br /><em>Specialized intelligence.</em></h2>
            <p>The orchestrator routes work to focused agents, keeps context intact, and brings decisions back to human review.</p>
          </div>
          <OrchestrationDiagram />
        </div>
      </section>

      <section ref={registerScene(3)} id="scene-workflow" className={`${styles.scene} ${styles.htmlScene}`} aria-labelledby="workflow-title">
        <div className={styles.stickyStage}>
          <Image src={reducedMotion ? MEDIA.workflow : MEDIA.workflowTransition.poster} alt="" width={1600} height={900} sizes="100vw" className={`${styles.poster} ${styles.posterDimmer}`} aria-hidden />
          {motionPreferenceReady && !reducedMotion && !videoFailed[2] && (
            <video
              ref={workflowVideoRef}
              className={`${styles.sceneVideo} ${styles.workflowVideo} ${videoReady[2] ? styles.mediaReady : ""}`}
              poster={MEDIA.workflowTransition.poster}
              width={1280}
              height={720}
              preload="none"
              muted
              playsInline
              disablePictureInPicture
              aria-hidden
              onLoadedMetadata={() => onMetadata(2)}
              onCanPlay={() => markReady(2)}
              onError={(event) => { if (event.currentTarget.error) markFailed(2) }}
            >
              <source media="(max-width: 700px)" src={MEDIA.workflowTransition.mobile} type="video/mp4" />
              <source src={MEDIA.workflowTransition.desktop} type="video/mp4" />
            </video>
          )}
          <SceneAtmosphere />
          <div className={`${styles.sceneCopy} ${styles.compactCopy}`}>
            <p className={styles.eyebrow}>04 · Workflow Transformation</p>
            <h2 id="workflow-title">Fragmented work becomes<br /><em>one accountable flow.</em></h2>
          </div>
          <div className={styles.workflowTrack} aria-label="Workflow from input to measurable output">
            {WORKFLOW_STEPS.map((step, index) => {
              const Icon = step.icon
              const state = index < workflowStep ? "complete" : index === workflowStep ? "active" : "waiting"
              return (
                <div key={step.label} className={styles.workflowUnit} data-state={state}>
                  <div className={styles.workflowNode}>
                    <span><Icon aria-hidden /></span>
                    <small>{String(index + 1).padStart(2, "0")}</small>
                    <strong>{step.label}</strong>
                    <p>{step.detail}</p>
                  </div>
                  {index < WORKFLOW_STEPS.length - 1 && <ArrowRight className={styles.workflowArrow} aria-hidden />}
                </div>
              )
            })}
          </div>
          {motionPreferenceReady && !videoReady[2] && !videoFailed[2] && !reducedMotion && <MediaLoading label="Reconfiguring workflow" />}
        </div>
      </section>

      <section ref={registerScene(4)} id="scene-platform" className={`${styles.scene} ${styles.htmlScene} ${styles.platformScene}`} aria-labelledby="platform-title">
        <div className={styles.stickyStage}>
          <SceneAtmosphere />
          <div className={`${styles.sceneCopy} ${styles.compactCopy}`}>
            <p className={styles.eyebrow}>05 · Platform Showcase</p>
            <h2 id="platform-title">The system becomes<br /><em>software people can use.</em></h2>
            <p>Custom platforms turn invisible automation into clear ownership, status, approvals, and delivery.</p>
          </div>
          <PlatformInterface activeStep={platformStep} />
        </div>
      </section>

      <section ref={registerScene(5)} id="scene-outcomes" className={`${styles.scene} ${styles.outcomeScene}`} aria-labelledby="outcomes-title">
        <div className={styles.stickyStage}>
          <SceneAtmosphere />
          <div className={`${styles.sceneCopy} ${styles.compactCopy}`}>
            <p className={styles.eyebrow}>06 · Business Outcomes</p>
            <h2 id="outcomes-title">Built around real<br /><em>operating needs.</em></h2>
            <p>No generic sci-fi layer. Every system resolves into a capability the business can own and operate.</p>
          </div>
          <div className={styles.outcomeGrid}>
            {OUTCOMES.map((outcome, index) => {
              const Icon = outcome.icon
              return (
                <article key={outcome.label} className={styles.outcomeCard} data-visible={index <= outcomeStep}>
                  <span className={styles.outcomeIndex}>0{index + 1}</span>
                  <Icon aria-hidden />
                  <h3>{outcome.label}</h3>
                  <p>{outcome.detail}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section ref={registerScene(6)} id="final-cta" className={`${styles.scene} ${styles.finalScene}`} aria-labelledby="final-title">
        <div className={styles.stickyStage}>
          <div className={styles.finalOrb} aria-hidden><span /><span /><span /></div>
          <SceneAtmosphere />
          <div className={styles.finalContent}>
            <p className={styles.eyebrow}>07 · The Next System</p>
            <h2 id="final-title">Build the system<br />your business is <em>missing.</em></h2>
            <p>Start with the operational gap. We map the scope, design the system, and build the operating layer around it.</p>
            <div className={styles.finalActions}>
              <Link href="/#selected-systems" className={styles.primaryAction}>View Selected Systems <ArrowRight aria-hidden /></Link>
              <Link href="/#booking" className={styles.secondaryAction}>Book a Strategy Call</Link>
              <Link href="/" className={styles.textAction}>Return to Standard Site</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function SceneAtmosphere() {
  return (
    <>
      <div className={styles.vignette} aria-hidden />
      <div className={styles.sceneGrid} aria-hidden />
      <div className={styles.redThread} aria-hidden />
    </>
  )
}

function ScrollCue() {
  return (
    <div className={styles.scrollCue} aria-hidden>
      <span>Scroll to enter</span>
      <i />
    </div>
  )
}

function MediaLoading({ label }: { label: string }) {
  return <div className={styles.mediaLoading} role="status"><span />{label}</div>
}

function OrchestrationDiagram() {
  return (
    <div className={styles.orchestrationDiagram} role="img" aria-label="Central orchestrator connected to research, content, analytics, outreach, and strategy agents">
      <svg viewBox="0 0 100 100" className={styles.agentConnections} aria-hidden>
        <circle cx="50" cy="50" r="32" />
        {[[-1, 0], [-0.31, -0.95], [0.81, -0.59], [0.81, 0.59], [-0.31, 0.95]].map(([x, y], index) => (
          <line key={index} x1="50" y1="50" x2={50 + x * 32} y2={50 + y * 32} />
        ))}
      </svg>
      <div className={styles.orchestratorCore}>
        <span><Bot aria-hidden /></span>
        <small>AX operating layer</small>
        <strong>Orchestrator</strong>
        <p>Routes · reviews · coordinates</p>
      </div>
      {AGENTS.map((agent, index) => {
        const Icon = agent.icon
        return (
          <article key={agent.label} className={`${styles.agentCard} ${styles[`agentPosition${index + 1}`]}`} style={{ "--agent-index": index } as StyleWithVariables}>
            <span><Icon aria-hidden /></span>
            <div><strong>{agent.label}</strong><small>{agent.detail}</small></div>
          </article>
        )
      })}
      <div className={styles.agentStatus}><i />One accountable operating layer</div>
    </div>
  )
}

function PlatformInterface({ activeStep }: { activeStep: number }) {
  return (
    <div className={styles.platformFrame} aria-label="Illustrative client operations platform">
      <header className={styles.platformHeader}>
        <div><Sparkles aria-hidden /><span><small>AX · BUSINESS OS</small><strong>Operations workspace</strong></span></div>
        <span><i />Architecture demo</span>
      </header>
      <div className={styles.platformBody}>
        <aside aria-label="Platform areas">
          <span className={styles.platformMark}>AX</span>
          {[PanelsTopLeft, Workflow, Bot, Database].map((Icon, index) => <span key={index} data-active={index === activeStep}><Icon aria-hidden /></span>)}
        </aside>
        <div className={styles.platformMain}>
          <div className={styles.platformTitle}>
            <span><small>CONNECTED DELIVERY</small><strong>One operating layer from request to output</strong></span>
            <em><ShieldCheck aria-hidden />Human-controlled</em>
          </div>
          <div className={styles.platformModules}>
            {PLATFORM_MODULES.map((module, index) => {
              const Icon = module.icon
              const active = index === activeStep
              return (
                <article key={module.label} data-active={active} data-complete={index < activeStep}>
                  <span><Icon aria-hidden /></span>
                  <div><small>0{index + 1}</small><strong>{module.label}</strong><p>{module.detail}</p></div>
                  {index < activeStep ? <Check aria-hidden /> : <ArrowRight aria-hidden />}
                </article>
              )
            })}
          </div>
          <div className={styles.activityPanel}>
            <header><span>OPERATIONS FEED</span><span><i />Systems connected</span></header>
            <p><i />New request routed to delivery <time>Now</time></p>
            <p><i />Scope queued for owner approval <time>12m</time></p>
            <p><i />Client workspace synchronized <time>38m</time></p>
          </div>
        </div>
      </div>
    </div>
  )
}
