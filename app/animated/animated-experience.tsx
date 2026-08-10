"use client"

import Image from "next/image"
import Link from "next/link"
import {
  BrainCircuit,
  Mail,
  PanelsTopLeft,
  PenTool,
  Search,
  Workflow,
  type LucideIcon,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"

import { AxWordmark } from "@/components/ui/ax-wordmark"

import styles from "./animated-experience.module.css"
import { ANIMATED_MEDIA as MEDIA } from "./media"

const AGENTS: Array<{ label: string; icon: LucideIcon; position: string }> = [
  { label: "Research", icon: Search, position: "15% 50%" },
  { label: "Strategy", icon: BrainCircuit, position: "50% 14%" },
  { label: "Content", icon: PenTool, position: "85% 50%" },
  { label: "Delivery", icon: PanelsTopLeft, position: "50% 86%" },
]

const ACTIONS: Array<{ verb: string; icon: LucideIcon }> = [
  { verb: "UNDERSTAND", icon: Search },
  { verb: "ROUTE", icon: BrainCircuit },
  { verb: "COORDINATE", icon: Workflow },
  { verb: "ACT", icon: Mail },
]

type StyleVariables = CSSProperties & Record<`--${string}`, string | number>

const clamp = (value: number) => Math.min(1, Math.max(0, value))

function local(value: number, start: number, end: number) {
  return clamp((value - start) / Math.max(0.001, end - start))
}

function smooth(value: number, start: number, end: number) {
  const progress = local(value, start, end)
  return progress * progress * (3 - 2 * progress)
}

function phaseOpacity(value: number, enterStart: number, enterEnd: number, exitStart: number, exitEnd: number) {
  return smooth(value, enterStart, enterEnd) * (1 - smooth(value, exitStart, exitEnd))
}

function storyProgress(story: HTMLElement | null) {
  if (!story) return 0
  const rect = story.getBoundingClientRect()
  return clamp(-rect.top / Math.max(1, rect.height - window.innerHeight))
}

export function AnimatedExperience() {
  const experienceRef = useRef<HTMLElement>(null)
  const storyRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const entityVideoRef = useRef<HTMLVideoElement>(null)
  const workflowVideoRef = useRef<HTMLVideoElement>(null)
  const durationRef = useRef([0, 0])
  const targetRef = useRef(0)
  const currentRef = useRef(0)
  const frameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef(0)
  const lastRequestedTimeRef = useRef([-1, -1])
  const pageVisibleRef = useRef(true)
  const workflowLoadRequestedRef = useRef(false)
  const assetStageRef = useRef(0)
  const finalActiveRef = useRef(false)

  const [reducedMotion, setReducedMotion] = useState(false)
  const [motionPreferenceReady, setMotionPreferenceReady] = useState(false)
  const [mediaReady, setMediaReady] = useState([false, false])
  const [mediaFailed, setMediaFailed] = useState([false, false])
  const [assetStage, setAssetStage] = useState(0)
  const [finalActive, setFinalActive] = useState(false)

  const paint = useCallback((progress: number) => {
    const stage = stageRef.current
    if (!stage) return

    const entityPush = smooth(progress, 0.34, 0.615)
    const orbit = smooth(progress, 0.455, 0.75)
    const workflowProgress = smooth(progress, 0.52, 0.87)
    const actionProgress = smooth(progress, 0.64, 0.91)
    const orbitAngle = (orbit - 0.5) * 14

    experienceRef.current?.style.setProperty("--story-progress", progress.toFixed(5))
    stage.style.setProperty("--story-progress", progress.toFixed(5))
    stage.style.setProperty("--entity-opacity", (1 - smooth(progress, 0.525, 0.62)).toFixed(5))
    stage.style.setProperty("--orchestration-opacity", phaseOpacity(progress, 0.465, 0.56, 0.69, 0.79).toFixed(5))
    stage.style.setProperty("--workflow-opacity", phaseOpacity(progress, 0.53, 0.63, 0.835, 0.93).toFixed(5))
    stage.style.setProperty("--action-opacity", phaseOpacity(progress, 0.645, 0.73, 0.875, 0.95).toFixed(5))
    stage.style.setProperty("--final-opacity", smooth(progress, 0.9, 0.975).toFixed(5))
    stage.style.setProperty("--entity-scale", (1 + entityPush * 0.022).toFixed(5))
    stage.style.setProperty("--orchestration-scale", (0.985 + orbit * 0.03).toFixed(5))
    stage.style.setProperty("--workflow-scale", (1.022 - workflowProgress * 0.022).toFixed(5))
    stage.style.setProperty("--action-scale", (0.988 + actionProgress * 0.012).toFixed(5))
    stage.style.setProperty("--orbit-angle", `${orbitAngle.toFixed(2)}deg`)
    stage.style.setProperty("--orbit-angle-negative", `${(-orbitAngle).toFixed(2)}deg`)
    stage.style.setProperty("--orbit-progress", orbit.toFixed(5))
    stage.style.setProperty("--action-progress", actionProgress.toFixed(5))

    const nextFinalActive = progress >= 0.9
    if (nextFinalActive !== finalActiveRef.current) {
      finalActiveRef.current = nextFinalActive
      setFinalActive(nextFinalActive)
    }
  }, [])

  const seekVideos = useCallback((progress: number) => {
    const targets = [
      smooth(progress, 0, 0.595),
      smooth(progress, 0.505, 0.875),
    ]
    const videos = [entityVideoRef.current, workflowVideoRef.current]
    videos.forEach((video, index) => {
      const duration = durationRef.current[index]
      if (!video || duration <= 0 || video.readyState < HTMLMediaElement.HAVE_METADATA) return
      const requestedTime = targets[index] * Math.max(0, duration - 0.025)
      const frameThreshold = 1 / 48
      if (
        Math.abs(video.currentTime - requestedTime) > frameThreshold
        && Math.abs(lastRequestedTimeRef.current[index] - requestedTime) > frameThreshold
      ) {
        lastRequestedTimeRef.current[index] = requestedTime
        video.currentTime = requestedTime
      }
    })
  }, [])

  const startFrame = useCallback(() => {
    if (frameRef.current !== null || !pageVisibleRef.current) return

    const tick = (timestamp: number) => {
      frameRef.current = null
      if (!pageVisibleRef.current) return

      const target = targetRef.current
      const elapsed = lastFrameTimeRef.current > 0
        ? Math.min(0.05, Math.max(1 / 120, (timestamp - lastFrameTimeRef.current) / 1000))
        : 1 / 60
      lastFrameTimeRef.current = timestamp
      const distance = Math.abs(target - currentRef.current)
      const response = 12 + Math.min(10, distance * 72)
      const blend = 1 - Math.exp(-response * elapsed)
      const current = reducedMotion ? target : currentRef.current + (target - currentRef.current) * blend
      currentRef.current = Math.abs(target - current) < 0.00035 ? target : current
      paint(currentRef.current)
      if (!reducedMotion) seekVideos(currentRef.current)

      const videosSeeking = entityVideoRef.current?.seeking || workflowVideoRef.current?.seeking
      if (Math.abs(target - currentRef.current) > 0.00035 || videosSeeking) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        lastFrameTimeRef.current = 0
      }
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [paint, reducedMotion, seekVideos])

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
    const update = () => {
      targetRef.current = storyProgress(storyRef.current)
      const nextAssetStage = targetRef.current >= 0.36 ? 2 : targetRef.current >= 0.24 ? 1 : 0
      if (nextAssetStage > assetStageRef.current) {
        assetStageRef.current = nextAssetStage
        setAssetStage(nextAssetStage)
      }
      if (targetRef.current >= 0.22 && !workflowLoadRequestedRef.current) {
        workflowLoadRequestedRef.current = true
        workflowVideoRef.current?.load()
      }
      startFrame()
    }

    const onVisibility = () => {
      pageVisibleRef.current = !document.hidden
      if (document.hidden && frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      } else if (!document.hidden) {
        lastFrameTimeRef.current = 0
        update()
      }
    }

    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update, { passive: true })
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      document.removeEventListener("visibilitychange", onVisibility)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [startFrame])

  const onMetadata = (index: number) => {
    const video = [entityVideoRef.current, workflowVideoRef.current][index]
    if (!video || !Number.isFinite(video.duration)) return
    durationRef.current[index] = video.duration
    startFrame()
  }

  const markReady = (index: number) => {
    setMediaReady((current) => current.map((ready, itemIndex) => itemIndex === index ? true : ready))
  }

  const markFailed = (index: number) => {
    setMediaFailed((current) => current.map((failed, itemIndex) => itemIndex === index ? true : failed))
  }

  const skipToActions = () => {
    const story = storyRef.current
    if (!story) return
    const top = window.scrollY + story.getBoundingClientRect().top + story.offsetHeight - window.innerHeight
    window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" })
  }

  return (
    <main ref={experienceRef} className={`${styles.experience} ${reducedMotion ? styles.reducedMotion : ""}`}>
      <button type="button" onClick={skipToActions} className={styles.skipLink}>Skip to actions</button>
      <h1 className={styles.srOnly}>AX Media Animated Experience</h1>

      <header className={styles.header}>
        <Link href="/" aria-label="AX Media home" className={styles.brandLink}>
          <AxWordmark className={styles.wordmark} />
        </Link>
        <div className={styles.progressTrack} aria-hidden><span /></div>
        <Link href="/" className={styles.returnLink}>Return to Standard Site</Link>
      </header>

      <section ref={storyRef} className={styles.story} aria-label="An AI entity becomes an orchestrated business system">
        <div ref={stageRef} className={styles.stage}>
          <div className={`${styles.layer} ${styles.entityLayer}`} aria-hidden>
            <Image src={MEDIA.entityPoster} alt="" fill priority sizes="100vw" className={styles.media} />
            {motionPreferenceReady && !reducedMotion && !mediaFailed[0] && (
              <video
                ref={entityVideoRef}
                className={`${styles.media} ${styles.video} ${mediaReady[0] ? styles.mediaReady : ""}`}
                preload="auto"
                muted
                playsInline
                disablePictureInPicture
                onLoadedMetadata={() => onMetadata(0)}
                onCanPlay={() => markReady(0)}
                onError={(event) => { if (event.currentTarget.error) markFailed(0) }}
              >
                <source media="(max-width: 700px)" src={MEDIA.entityThroughCore.mobile} type="video/mp4" />
                <source src={MEDIA.entityThroughCore.desktop} type="video/mp4" />
              </video>
            )}
          </div>

          {assetStage >= 1 && <OrchestrationLayer />}

          <div className={`${styles.layer} ${styles.workflowLayer}`} aria-hidden>
            {assetStage >= 2 && <Image src={MEDIA.workflowPoster} alt="" fill sizes="100vw" className={styles.media} />}
            {motionPreferenceReady && !reducedMotion && !mediaFailed[1] && (
              <video
                ref={workflowVideoRef}
                className={`${styles.media} ${styles.video} ${mediaReady[1] ? styles.mediaReady : ""}`}
                preload="none"
                muted
                playsInline
                disablePictureInPicture
                onLoadedMetadata={() => onMetadata(1)}
                onCanPlay={() => markReady(1)}
                onError={(event) => { if (event.currentTarget.error) markFailed(1) }}
              >
                <source media="(max-width: 700px)" src={MEDIA.workflow.mobile} type="video/mp4" />
                <source src={MEDIA.workflow.desktop} type="video/mp4" />
              </video>
            )}
          </div>

          <ActionField />

          <div id="final-cta" className={`${styles.layer} ${styles.finalLayer}`} data-active={finalActive} aria-hidden={!finalActive}>
            <div className={styles.finalMark} aria-hidden><span /><i /><span /></div>
            <nav className={styles.finalActions} aria-label="Animated experience actions">
              <Link href="/" tabIndex={finalActive ? undefined : -1}>Return to Standard Site</Link>
              <Link href="/#booking" tabIndex={finalActive ? undefined : -1} className={styles.primaryAction}>Book a Call</Link>
            </nav>
          </div>

          {!reducedMotion && motionPreferenceReady && !mediaReady[0] && !mediaFailed[0] && (
            <div className={styles.loading} role="status"><span />Preparing the system</div>
          )}
          <div className={styles.vignette} aria-hidden />
          <div className={styles.scrollCue} aria-hidden><span>Scroll</span><i /></div>
        </div>
      </section>
    </main>
  )
}

function OrchestrationLayer() {
  return (
    <>
      <div className={`${styles.layer} ${styles.orchestrationLayer}`} aria-hidden>
        <Image src={MEDIA.orchestrationPoster} alt="" fill sizes="100vw" className={`${styles.media} ${styles.orchestrationBackdrop}`} />
      </div>
      <div className={`${styles.layer} ${styles.orchestrationLabels}`}>
        <div className={styles.orbitArchitecture} role="img" aria-label="A central orchestrator coordinating four specialized agents">
          <div className={styles.orbitRing} aria-hidden><span /><span /></div>
          <div className={styles.signalPaths} aria-hidden>
            {AGENTS.map((agent, index) => (
              <span key={agent.label} style={{ "--path-index": index } as StyleVariables}><i /></span>
            ))}
          </div>
          <div className={styles.orbitNodes}>
            {AGENTS.map((agent, index) => {
              const Icon = agent.icon
              const [left, top] = agent.position.split(" ")
              return (
                <div key={agent.label} className={styles.agentAnchor} style={{ left, top, "--agent-index": index } as StyleVariables}>
                  <span className={styles.agentDot} aria-hidden><Icon /></span>
                  <span className={styles.agentLabel}>{agent.label}</span>
                </div>
              )
            })}
          </div>
          <div className={styles.orchestrator}>
            <span className={styles.orchestratorCore} aria-hidden><i /><i /></span>
            <strong>Orchestrator</strong>
          </div>
        </div>
      </div>
    </>
  )
}

function ActionField() {
  return (
    <div className={`${styles.layer} ${styles.actionLayer}`} aria-label="The system understands, routes, coordinates, and acts">
      <div className={styles.actionAxis} aria-hidden><span /></div>
      <div className={styles.actionSequence} role="list">
        {ACTIONS.map((action, index) => {
          const Icon = action.icon
          return (
            <div key={action.verb} role="listitem" className={styles.actionNode} style={{ "--action-index": index } as StyleVariables}>
              <span className={styles.actionIndex}>0{index + 1}</span>
              <span className={styles.actionGlyph}><Icon aria-hidden /></span>
              <strong>{action.verb}</strong>
            </div>
          )
        })}
      </div>
    </div>
  )
}
