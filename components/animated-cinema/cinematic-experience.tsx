"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowDown, RotateCcw } from "lucide-react"
import { useEffect, useRef, type ReactNode } from "react"

import { AxWordmark } from "@/components/ui/ax-wordmark"
import { trackFunnel } from "@/lib/conversion/track"
import { CINEMA, POSTERS } from "./config"
import { CinemaFrameCache } from "./frame-cache"
import { clamp, ease, filmRect, follow, frameAt, frameUrl, framingAt, posterWeights } from "./timeline"

import styles from "./cinematic-experience.module.css"

type FrameSurface = {
  image: CanvasImageSource
  width: number
  height: number
  close: () => void
}

/** Keeps the frame film dormant behind its matching poster until it is useful. */
export class CinemaFrameActivation {
  activated = false
  private disposed = false

  activate(progress: number, intent: boolean, start: () => void) {
    if (this.disposed || this.activated || (!intent && !(Number.isFinite(progress) && progress > 0.0001))) return false
    this.activated = true
    start()
    return true
  }

  dispose() { this.disposed = true }
}

/** Safari fallback releases the object URL and image surface just like a bitmap. */
async function decodeFrame(blob: Blob): Promise<FrameSurface> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob)
      return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
    } catch { /* Some Safari versions expose the API without WebP bitmap support. */ }
  }
  const url = URL.createObjectURL(blob)
  const image = new window.Image()
  image.decoding = "async"
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error("Frame could not be decoded"))
      image.src = url
    })
    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => { image.removeAttribute("src"); URL.revokeObjectURL(url) },
    }
  } catch (error) { URL.revokeObjectURL(url); throw error }
}

/** The route supplies server-rendered final copy and links, not another client island. */
export function CinematicExperience({ resolution }: { resolution: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const storyRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const finalRef = useRef<HTMLDivElement>(null)
  const postersRef = useRef<Array<HTMLDivElement | null>>([])
  const labelsRef = useRef<Array<HTMLSpanElement | null>>([])
  const phasesRef = useRef<Array<HTMLSpanElement | null>>([])
  const loadingRef = useRef<HTMLDivElement>(null)
  const replayRef = useRef<(() => void) | null>(null)
  const skipRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const root = rootRef.current, story = storyRef.current, canvas = canvasRef.current
    if (!root || !story || !canvas) return
    const context = canvas.getContext("2d", { alpha: false })
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    let cache: CinemaFrameCache<FrameSurface> | null = null
    const activation = new CinemaFrameActivation()
    let target = 0, presented = 0, interpolated = 0, lastTime = 0
    let pendingProposal: { target: number; progress: number } | null = null
    let direction = 1, frame: number | null = null
    let disposed = false, fallback = !context, visible = !document.hidden
    let width = 1, height = 1, mobile = false, preferenceReady = false
    let hasFrame = false, pendingReplay = false, focusResolution = false
    let storyTop = 0, storyRange = 1, resizeFrame: number | null = null
    let intentListenersAttached = false

    const geometry = (progress: number) => {
      const framing = framingAt(progress, width / height < 0.95 ? CINEMA.framing.portrait : CINEMA.framing.desktop)
      // Static accessibility/network fallbacks must never inherit an interior
      // camera crop. Preserve the full-entity safe framing for their stills.
      return filmRect(width, height, CINEMA.sourceWidth / CINEMA.sourceHeight, {
        ...framing,
        immersion: preference.matches || fallback ? 0 : framing.immersion,
      })
    }

    const paintLayers = (progress: number) => {
      const rect = geometry(progress)
      root.style.setProperty("--film-x", `${rect.x}px`)
      root.style.setProperty("--film-y", `${rect.y}px`)
      root.style.setProperty("--film-width", `${rect.width}px`)
      root.style.setProperty("--film-height", `${rect.height}px`)
      const weights = posterWeights(progress, POSTERS.map(poster => poster.at))
      postersRef.current.forEach((poster, index) => { if (poster) poster.style.opacity = String(weights[index]) })
      root.style.setProperty("--canvas-visible", hasFrame && !fallback && !preference.matches && !pendingReplay ? "1" : "0")
      const orbit = ease(progress, CINEMA.orbit.enter, CINEMA.orbit.readable) * (1 - ease(progress, CINEMA.orbit.leave, CINEMA.orbit.exit))
      labelsRef.current.forEach((label, index) => {
        if (!label) return
        const agent = CINEMA.agents[index]
        label.style.left = `${rect.x + agent.x * rect.width}px`
        label.style.top = `${rect.y + agent.y * rect.height}px`
        label.style.opacity = String(orbit)
        label.setAttribute("aria-hidden", String(orbit < 0.95))
      })
      phasesRef.current.forEach((phase, index) => {
        const timing = CINEMA.phases[index]
        if (phase) phase.style.opacity = String(ease(progress, timing.start, timing.start + 0.035) * (1 - ease(progress, timing.end - 0.035, timing.end)) * (1 - orbit))
      })
      const resolution = ease(progress, CINEMA.resolution.enter, CINEMA.resolution.readable)
      root.style.setProperty("--resolution", String(resolution))
      root.style.setProperty("--film-opacity", String(1 - resolution * 0.82))
      if (finalRef.current) {
        finalRef.current.inert = resolution < 0.99
        finalRef.current.setAttribute("aria-hidden", String(resolution < 0.99))
        if (focusResolution && resolution >= 0.99) {
          finalRef.current.querySelector<HTMLElement>("a,button")?.focus({ preventScroll: true })
          focusResolution = false
        }
      }
    }

    const paintFilm = (position: number, progress: number) => {
      const pair = cache?.get(position)
      if (!pair || !context) return false
      const rect = geometry(progress)
      context.fillStyle = "#000"
      context.fillRect(0, 0, width, height)
      context.globalAlpha = 1
      context.drawImage(pair.from.image, rect.x, rect.y, rect.width, rect.height)
      if (pair.blend > 0) {
        context.globalAlpha = pair.blend
        context.drawImage(pair.to.image, rect.x, rect.y, rect.width, rect.height)
        context.globalAlpha = 1
      }
      hasFrame = true
      pendingReplay = false
      return true
    }

    function requestTick() {
      if (disposed || !visible || !preferenceReady || frame !== null) return
      frame = requestAnimationFrame(tick)
    }

    function tick(now: number) {
      frame = null
      if (disposed || !visible) return
      const elapsed = lastTime ? (now - lastTime) / 1000 : 1 / 60
      lastTime = now
      // Lock the exact proposal across decode retries. A retry may have a
      // different RAF interval, but cannot move the image it is waiting for.
      if (preference.matches || fallback) {
        pendingProposal = null
        interpolated = target
      } else {
        if (!pendingProposal || pendingProposal.target !== target) {
          pendingProposal = { target, progress: follow(presented, target, elapsed) }
        }
        interpolated = pendingProposal.progress
      }
      const requested = frameAt(interpolated, CINEMA.frameCount, CINEMA.filmEnd)
      // Before real scroll intent the matching poster is the complete opening
      // visual, so the route is ready without allocating or fetching frames.
      let ready = preference.matches || fallback || !activation.activated
      if (!ready && cache) {
        cache.request(requested, direction)
        if (cache.failedAt(requested)) {
          fallback = true
          cache.dispose()
          cache = null
          root!.dataset.renderer = "poster-fallback"
          ready = true
        } else ready = paintFilm(requested, interpolated)
      }
      root!.dataset.buffering = String(!ready)
      loadingRef.current?.setAttribute("aria-hidden", String(ready))
      if (ready) { presented = interpolated; pendingProposal = null; paintLayers(presented) }
      if (ready && Math.abs(interpolated - target) > 0.00001) requestTick()
      else lastTime = 0
    }

    const createCache = () => {
      cache?.dispose()
      cache = null
      if (preference.matches || fallback) return
      const frameWidth = mobile ? CINEMA.mobileWidth : CINEMA.desktopWidth
      cache = new CinemaFrameCache({
        frameCount: CINEMA.frameCount,
        width: frameWidth,
        height: Math.round(frameWidth * CINEMA.sourceHeight / CINEMA.sourceWidth),
        mobile,
        load: async (index, signal) => {
          const response = await fetch(frameUrl(CINEMA.root, index, mobile), { signal, cache: "force-cache" })
          if (!response.ok) throw new Error("Frame unavailable")
          return response.blob()
        },
        decode: decodeFrame,
        onChange: requestTick,
      })
      cache.setActive(visible)
      cache.request(frameAt(presented, CINEMA.frameCount, CINEMA.filmEnd), direction)
    }

    const detachIntentListeners = () => {
      if (!intentListenersAttached) return
      intentListenersAttached = false
      window.removeEventListener("wheel", onScrollIntent)
      window.removeEventListener("touchstart", onScrollIntent)
      window.removeEventListener("keydown", onKeyIntent)
    }
    const ensureCache = (intent = false) => {
      if (!preferenceReady || preference.matches || fallback) return false
      const activated = activation.activate(target, intent, createCache)
      if (activated) detachIntentListeners()
      return activated
    }
    function onScrollIntent() { ensureCache(true) }
    function onKeyIntent(event: KeyboardEvent) {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) ensureCache(true)
    }
    const attachIntentListeners = () => {
      if (intentListenersAttached || activation.activated) return
      intentListenersAttached = true
      window.addEventListener("wheel", onScrollIntent, { passive: true })
      window.addEventListener("touchstart", onScrollIntent, { passive: true })
      window.addEventListener("keydown", onKeyIntent)
    }

    const readScroll = () => {
      const next = clamp((window.scrollY - storyTop) / storyRange)
      if (next !== target) {
        direction = next > target ? 1 : -1
        pendingProposal = null
      }
      target = next
      ensureCache()
      requestTick()
    }
    const measureStory = () => {
      storyTop = window.scrollY + story.getBoundingClientRect().top
      storyRange = Math.max(1, story.offsetHeight - window.innerHeight)
    }
    const resize = () => {
      resizeFrame = null
      const wasMobile = mobile
      width = window.innerWidth
      height = window.innerHeight
      mobile = width < 768
      const ratio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context?.setTransform(ratio, 0, 0, ratio, 0, 0)
      measureStory()
      // A variant change never draws an old nearest frame in the new composition.
      hasFrame = false
      if (preferenceReady && activation.activated && wasMobile !== mobile) createCache()
      paintLayers(presented)
      readScroll()
    }
    const scheduleResize = () => {
      if (resizeFrame === null) resizeFrame = requestAnimationFrame(resize)
    }
    const visibility = () => {
      visible = !document.hidden
      cache?.setActive(visible)
      if (!visible && frame !== null) { cancelAnimationFrame(frame); frame = null }
      lastTime = 0
      if (visible) scheduleResize()
    }
    const changePreference = () => {
      root.dataset.reducedMotion = String(preference.matches)
      root.dataset.renderer = preference.matches ? "reduced-motion" : fallback ? "poster-fallback" : "frame-sequence"
      pendingProposal = null
      hasFrame = false
      if (preference.matches || activation.activated) createCache()
      else ensureCache()
      paintLayers(presented)
      requestTick()
    }

    replayRef.current = () => {
      pendingReplay = true
      hasFrame = false
      target = 0; interpolated = 0; presented = 0; direction = 1
      pendingProposal = null
      focusResolution = false
      cache?.request(0, 1)
      paintLayers(0)
      window.scrollTo({ top: window.scrollY + story.getBoundingClientRect().top, behavior: "instant" })
      requestTick()
    }
    skipRef.current = () => {
      focusResolution = true
      window.scrollTo({ top: window.scrollY + story.getBoundingClientRect().top + story.offsetHeight - window.innerHeight, behavior: "instant" })
      readScroll()
    }
    resize()
    preferenceReady = true
    attachIntentListeners()
    changePreference()
    window.addEventListener("scroll", readScroll, { passive: true })
    window.addEventListener("resize", scheduleResize, { passive: true })
    document.addEventListener("visibilitychange", visibility)
    preference.addEventListener("change", changePreference)
    readScroll()

    return () => {
      disposed = true
      if (frame !== null) cancelAnimationFrame(frame)
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame)
      activation.dispose()
      detachIntentListeners()
      cache?.dispose()
      replayRef.current = null
      skipRef.current = null
      window.removeEventListener("scroll", readScroll)
      window.removeEventListener("resize", scheduleResize)
      document.removeEventListener("visibilitychange", visibility)
      preference.removeEventListener("change", changePreference)
      canvas.width = 1; canvas.height = 1
    }
  }, [])

  return (
    <div ref={rootRef} className={styles.experience} data-renderer="poster" data-buffering="false">
      <section ref={storyRef} className={styles.story} aria-label="An AI task becomes a coordinated working system">
        <div className={styles.stage}>
          <div className={styles.film} aria-hidden="true">
            {POSTERS.map((poster, index) => (
              <div key={poster.name} className={styles.poster} ref={element => { postersRef.current[index] = element }} style={{ opacity: index === 0 ? 1 : 0 }}>
                <picture>
                  <source media="(max-width: 767px)" srcSet={`${CINEMA.root}/${poster.name}-mobile.webp`} />
                  <Image src={`${CINEMA.root}/${poster.name}.webp`} alt="" fill sizes="100vw" loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} unoptimized />
                </picture>
              </div>
            ))}
            <canvas ref={canvasRef} className={styles.canvas} />
          </div>
          <header className={styles.header}>
            <Link href="/" className={styles.brand} aria-label="AX Media standard site"><AxWordmark /></Link>
            <Link href="/" className={styles.return}>Return to Standard Site</Link>
          </header>
          <div className={styles.agents}>
            {CINEMA.agents.map((agent, index) => <span key={agent.name} ref={element => { labelsRef.current[index] = element }} className={styles.agent} data-role={agent.name === "Orchestrator" ? "orchestrator" : "agent"} aria-hidden="true">{agent.name}</span>)}
          </div>
          <div className={styles.phase} aria-hidden="true">
            {CINEMA.phases.map((phase, index) => <span key={phase.text} ref={element => { phasesRef.current[index] = element }}>{phase.text}</span>)}
          </div>
          <div className={styles.controls}>
            <button type="button" onClick={() => replayRef.current?.()} aria-label="Replay the experience"><RotateCcw size={15} /><span>Replay</span></button>
            <button type="button" onClick={() => skipRef.current?.()} aria-label="Skip to navigation"><span>Explore</span><ArrowDown size={15} /></button>
          </div>
          <div ref={loadingRef} className={styles.loading} role="status" aria-live="polite" aria-hidden="true"><span>Preparing motion</span></div>
          <div ref={finalRef} className={styles.resolution} inert aria-hidden="true" onClick={event => {
            const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href='/#booking']")
            if (link) trackFunnel("primary_cta_clicked")
          }}>{resolution}</div>
        </div>
      </section>
    </div>
  )
}
