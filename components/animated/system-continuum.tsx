"use client"

import { useCallback, useEffect, useRef, type CSSProperties } from "react"

import styles from "./system-continuum.module.css"

const SYSTEM_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_230229_7c9bc431-46cf-489a-948d-e8144d8eb5d4.mp4"

const SYSTEMS = [
  { index: "01", name: "GO-TO-MARKET", steps: ["Research", "Qualify", "Approve", "Activate"] },
  { index: "02", name: "CONTENT SYSTEM", steps: ["Research", "Create", "Review", "Distribute"] },
  { index: "03", name: "BUSINESS PLATFORMS", steps: ["Intake", "Operate", "Approve", "Deliver"] },
] as const

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

export function SystemContinuum() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<number | null>(null)

  const paint = useCallback(() => {
    frameRef.current = null
    const section = sectionRef.current
    const stage = stageRef.current
    if (!section || !stage) return

    const rect = section.getBoundingClientRect()
    const progress = clamp(-rect.top / Math.max(1, rect.height - window.innerHeight))

    stage.style.setProperty("--continuum-progress", progress.toFixed(4))
    stage.style.setProperty("--state-0", (1 - smooth(progress, 0.24, 0.39)).toFixed(4))
    stage.style.setProperty("--state-1", phaseOpacity(progress, 0.27, 0.42, 0.57, 0.72).toFixed(4))
    stage.style.setProperty("--state-2", smooth(progress, 0.6, 0.76).toFixed(4))
    stage.style.setProperty("--state-progress-0", local(progress, 0, 0.34).toFixed(4))
    stage.style.setProperty("--state-progress-1", local(progress, 0.33, 0.67).toFixed(4))
    stage.style.setProperty("--state-progress-2", local(progress, 0.66, 1).toFixed(4))
  }, [])

  useEffect(() => {
    const requestPaint = () => {
      if (frameRef.current === null) frameRef.current = requestAnimationFrame(paint)
    }

    const video = videoRef.current
    const section = sectionRef.current
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let visible = false

    const syncPlayback = () => {
      if (!video) return
      if (!visible || document.hidden || reduceMotion.matches) {
        video.pause()
        return
      }
      void video.play().catch(() => undefined)
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting)
      syncPlayback()
    }, { threshold: 0.08 })

    if (section) observer.observe(section)
    paint()
    window.addEventListener("scroll", requestPaint, { passive: true })
    window.addEventListener("resize", requestPaint, { passive: true })
    document.addEventListener("visibilitychange", syncPlayback)
    reduceMotion.addEventListener?.("change", syncPlayback)

    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", requestPaint)
      window.removeEventListener("resize", requestPaint)
      document.removeEventListener("visibilitychange", syncPlayback)
      reduceMotion.removeEventListener?.("change", syncPlayback)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      video?.pause()
    }
  }, [paint])

  return (
    <section ref={sectionRef} id="system-continuum" className={styles.continuum} aria-label="Three connected AX Media business systems">
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.environment} aria-hidden>
          <video
            ref={videoRef}
            className={styles.video}
            muted
            loop
            playsInline
            preload="metadata"
            poster="/animated/posters/liquid-system.jpg"
            disablePictureInPicture
          >
            <source src={SYSTEM_VIDEO} type="video/mp4" />
          </video>
          <div className={styles.environmentWash} />
        </div>

        <div className={styles.stateStack}>
          {SYSTEMS.map((system, systemIndex) => (
            <article
              key={system.name}
              className={styles.systemState}
              style={{
                "--state-opacity": `var(--state-${systemIndex})`,
                "--state-progress": `var(--state-progress-${systemIndex})`,
              } as StyleVariables}
              aria-label={`${system.name}: ${system.steps.join(", ")}`}
            >
              <header className={styles.stateHeader}>
                <span>{system.index}</span>
                <h2>{system.name}</h2>
              </header>

              <div className={styles.flow} aria-hidden>
                <div className={styles.axis}><span /></div>
                {system.steps.map((step, stepIndex) => (
                  <div key={step} className={styles.node} style={{ "--node-index": stepIndex } as StyleVariables}>
                    <i />
                    <strong>{step}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className={styles.stateRail} aria-hidden>
          {SYSTEMS.map((system, index) => (
            <span key={system.name} style={{ "--rail-opacity": `var(--state-${index})` } as StyleVariables}>{system.index}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
