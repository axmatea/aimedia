'use client'

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { Application } from '@splinetool/runtime'

const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
  onLoad?: (app: Application) => void
  /** Static poster shown as the loading placeholder until the live scene is interactive */
  mobileFallback?: string
}

type SplineObject = {
  name: string
  rotation: { x: number; y: number; z: number }
}

type SplineApp = Application & {
  canvas?: HTMLCanvasElement | null
  getAllObjects?: () => SplineObject[]
  findObjectByName?: (name: string) => SplineObject | undefined
  play?: () => void
  stop?: () => void
  _splineCleanup?: () => void
}

// Cap the canvas backing store on phones so retina (dpr 2-3) does not melt the GPU.
// Only CSS-transparent backing resolution changes here, layout is untouched.
const MOBILE_DPR_CAP = 1.5

// Possible head object names across common Spline robot scenes
const HEAD_NAMES = ['Head', 'head', 'Robot_Head', 'robot_head', 'HEAD', 'Helmet', 'helmet', 'Skull', 'skull']

export function SplineScene({ scene, className, onLoad, mobileFallback }: SplineSceneProps) {
  // Poster shows instantly while the 3D scene boots, then the live scene takes over
  const [sceneReady, setSceneReady] = useState(false)
  // Motion gate: null until measured on the client. false only when the OS asks for
  // reduced motion, in which case the static poster stays as the whole hero (a11y).
  const [motionOk, setMotionOk] = useState<boolean | null>(null)
  // Phones use the poster permanently. The live Spline canvas boots too large on
  // iOS Safari before it settles, causing the frozen half-loaded robot NAŸL saw.
  const [staticMobile, setStaticMobile] = useState(false)
  // Lazy init: only mount the Spline runtime once the hero is near the viewport.
  const [inView, setInView] = useState(false)
  // Head mouse-follow lerp only runs on fine-pointer (cursor) devices. On touch the
  // scene still plays its own idle animation, we just skip the wasted pointer work.
  const interactiveRef = useRef(true)

  useEffect(() => {
    const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const staticMobileQuery = window.matchMedia('(max-width: 767px)')

    const syncMotion = () => setMotionOk(!reducedMotionQuery.matches)
    const syncMobile = () => setStaticMobile(Boolean(mobileFallback) && staticMobileQuery.matches)
    const syncInteractive = () => {
      interactiveRef.current = finePointerQuery.matches && !reducedMotionQuery.matches
    }

    syncMotion()
    syncMobile()
    syncInteractive()

    const onReduced = () => {
      syncMotion()
      syncInteractive()
    }
    const onPointer = () => syncInteractive()
    const onMobile = () => syncMobile()

    reducedMotionQuery.addEventListener?.('change', onReduced)
    finePointerQuery.addEventListener?.('change', onPointer)
    staticMobileQuery.addEventListener?.('change', onMobile)

    return () => {
      reducedMotionQuery.removeEventListener?.('change', onReduced)
      finePointerQuery.removeEventListener?.('change', onPointer)
      staticMobileQuery.removeEventListener?.('change', onMobile)
    }
  }, [mobileFallback])

  // Cap devicePixelRatio on coarse-pointer (touch) devices. Desktop keeps full
  // crispness. The runtime reads window.devicePixelRatio live (init + per frame),
  // so we shadow the getter for the lifetime of the mounted hero and restore on unmount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const coarse =
      window.matchMedia('(pointer: coarse)').matches ||
      !window.matchMedia('(pointer: fine)').matches
    if (!coarse || window.devicePixelRatio <= MOBILE_DPR_CAP) return

    const proto = Object.getPrototypeOf(window)
    const realGet = Object.getOwnPropertyDescriptor(proto, 'devicePixelRatio')?.get
    try {
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        get() {
          const real = realGet ? Number(realGet.call(window)) : MOBILE_DPR_CAP
          return Math.min(real, MOBILE_DPR_CAP)
        },
      })
    } catch {
      return
    }

    return () => {
      try {
        delete (window as unknown as { devicePixelRatio?: number }).devicePixelRatio
      } catch {
        // leave the cap in place if the environment blocks deletion
      }
    }
  }, [])

  const appRef = useRef<SplineApp | null>(null)
  const visibleRef = useRef(true)
  const startLerpRef = useRef<(() => void) | null>(null)
  const headRef = useRef<{ rotation: { x: number; y: number; z: number } } | null>(null)
  const headBaseRotation = useRef({ x: 0, y: 0, z: 0 })
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })

  const handleLoad = useCallback((app: Application) => {
    const splineApp = app as SplineApp
    appRef.current = splineApp
    const canvas = splineApp.canvas
    const isInteractive = interactiveRef.current

    if (canvas) {
      canvas.style.background = 'transparent'
      canvas.style.backgroundColor = 'transparent'
    }

    // Find head object by trying common names
    const objects = splineApp.getAllObjects?.() ?? []

    let headObj: SplineObject | undefined
    for (const name of HEAD_NAMES) {
      headObj = objects.find((o: { name: string }) => o.name === name)
        ?? splineApp.findObjectByName?.(name)
      if (headObj) break
    }

    if (headObj) {
      headRef.current = headObj
      headBaseRotation.current = {
        x: headObj.rotation.x,
        y: headObj.rotation.y,
        z: headObj.rotation.z,
      }
    }

    let forwardMouse: ((e: MouseEvent) => void) | null = null

    if (isInteractive) {
      // Forward global mouse to canvas (activates built-in Spline events too)
      forwardMouse = (e: MouseEvent) => {
        if (!visibleRef.current) return
        canvas?.dispatchEvent(new MouseEvent('mousemove', {
          bubbles: false, cancelable: true,
          clientX: e.clientX, clientY: e.clientY,
          screenX: e.screenX, screenY: e.screenY,
          movementX: e.movementX, movementY: e.movementY,
        }))

        // Update target for smooth lerp
        const vw = window.innerWidth
        const vh = window.innerHeight
        targetRef.current = {
          x: (e.clientX / vw - 0.5),   // -0.5 … 0.5
          y: (e.clientY / vh - 0.5),   // -0.5 … 0.5
        }
      }

      window.addEventListener('mousemove', forwardMouse)

      // Smooth lerp animation loop for direct head rotation
      const MAX_Y = 0.6   // radians ~34° horizontal
      const MAX_X = 0.4   // radians ~23° vertical
      const LERP  = 0.08  // smoothing factor (faster response)

      const animate = () => {
        rafRef.current = requestAnimationFrame(animate)

        // Lerp current → target
        currentRef.current.x += (targetRef.current.x - currentRef.current.x) * LERP
        currentRef.current.y += (targetRef.current.y - currentRef.current.y) * LERP

        if (headRef.current) {
          headRef.current.rotation.y = headBaseRotation.current.y + currentRef.current.x * MAX_Y * 2
          headRef.current.rotation.x = headBaseRotation.current.x + currentRef.current.y * MAX_X
        }
      }
      startLerpRef.current = () => {
        if (rafRef.current === null) rafRef.current = requestAnimationFrame(animate)
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    // Cleanup
    const cleanup = () => {
      if (forwardMouse) {
        window.removeEventListener('mousemove', forwardMouse)
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
    splineApp._splineCleanup = cleanup

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSceneReady(true)
        onLoad?.(app)
      })
    })
  }, [onLoad])

  // Lazy-init when near the viewport, then pause the render loop when off-screen.
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const setActive = (active: boolean) => {
      visibleRef.current = active
      const app = appRef.current
      if (active) {
        app?.play?.()
        startLerpRef.current?.()
      } else {
        app?.stop?.()
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
      }
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        // Mount the runtime once when it first approaches view, keep it mounted
        // afterwards so scrolling does not trigger an expensive reload.
        if (entry.isIntersecting) setInView(true)
        setActive(entry.isIntersecting)
      },
      // rootMargin preloads slightly before the hero scrolls in
      { threshold: 0.05, rootMargin: '200px' }
    )
    obs.observe(el)
    // Pause everything when the tab is hidden (battery / thermal)
    const onVis = () => setActive(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      obs.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      if (appRef.current) {
        appRef.current._splineCleanup?.()
      }
    }
  }, [])

  // Render the live scene on every viewport once motion is allowed and the hero is
  // near view. Reduced-motion keeps the poster only.
  const showScene = motionOk === true && inView && !staticMobile
  // Poster covers the brief pre-measure window, the boot period before the scene is
  // ready, stays permanently when reduced motion is requested, and is the only
  // mobile rendering path to avoid iOS Safari exposing Spline's oversized boot frame.
  const showPoster = Boolean(mobileFallback) && (staticMobile || !showScene || !sceneReady)

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden hero-spline-stage">
      {/* Instant poster placeholder while the 3D runtime + scene loads. It stays on top until the live canvas is fully ready, so users never see a half-booted frozen Spline frame. */}
      {showPoster && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={mobileFallback}
          alt=""
          decoding="sync"
          loading="eager"
          fetchPriority="high"
          className={`${className ?? ''} hero-spline-poster`}
          style={{ objectFit: 'contain', width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        />
      )}
      {showScene && (
        <div className={`hero-spline-live ${sceneReady ? 'is-ready' : ''}`} aria-hidden={!sceneReady}>
          <Suspense fallback={null}>
            <Spline scene={scene} className={className} onLoad={handleLoad} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
