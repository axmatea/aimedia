'use client'

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { Application } from '@splinetool/runtime'

const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
  onLoad?: (app: Application) => void
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
//
// Why a devicePixelRatio shadow and not app.setSize(): verified against
// @splinetool/runtime 1.x source. Application.setSize(w, h) takes CSS pixels and
// multiplies by the renderer pixel ratio internally, and that ratio is captured
// ONCE at boot from window.devicePixelRatio (_getPixelRatio case 0). There is no
// public per-app pixel ratio API, and the runtime installs its own ResizeObserver
// on the canvas parent ~300ms after start that rewrites the viewport from
// canvas.clientWidth/Height, wiping any manual size on the first resize. So
// passing a pre-multiplied size would INFLATE the backing store (css * cap * dpr)
// and then get reverted. Capping the live window.devicePixelRatio getter before
// the runtime boots caps every read consistently (renderer ratio, UI canvases,
// transition uniforms) and survives the runtime's own resize path.
const MOBILE_DPR_CAP = 1.5

// Possible head object names across common Spline robot scenes
const HEAD_NAMES = ['Head', 'head', 'Robot_Head', 'robot_head', 'HEAD', 'Helmet', 'helmet', 'Skull', 'skull']

export function SplineScene({ scene, className, onLoad }: SplineSceneProps) {
  // Nothing renders until the live scene is ready: the dark ambient hero
  // background carries the space, then the 3D scene fades and settles in.
  const [sceneReady, setSceneReady] = useState(false)
  // Motion gate: null until measured on the client. false only when the OS asks
  // for reduced motion, in which case the scene never mounts and the hero stays
  // as the clean dark background plus text (the robot is decorative).
  const [motionOk, setMotionOk] = useState<boolean | null>(null)
  // Lazy init: only mount the Spline runtime once the hero is near the viewport.
  const [inView, setInView] = useState(false)
  // Heavy Spline runtime is intentionally delayed until after first paint so it
  // never competes with hydration or the initial chunk work.
  const [canMountScene, setCanMountScene] = useState(false)
  // Head mouse-follow lerp only runs on fine-pointer (cursor) devices. On touch the
  // scene still plays its own idle animation, we just skip the wasted pointer work.
  const interactiveRef = useRef(true)

  useEffect(() => {
    const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const syncMotion = () => setMotionOk(!reducedMotionQuery.matches)
    const syncInteractive = () => {
      interactiveRef.current = finePointerQuery.matches && !reducedMotionQuery.matches
    }

    syncMotion()
    syncInteractive()

    const onReduced = () => {
      syncMotion()
      syncInteractive()
    }
    const onPointer = () => syncInteractive()

    reducedMotionQuery.addEventListener?.('change', onReduced)
    finePointerQuery.addEventListener?.('change', onPointer)

    return () => {
      reducedMotionQuery.removeEventListener?.('change', onReduced)
      finePointerQuery.removeEventListener?.('change', onPointer)
    }
  }, [])

  // Cap devicePixelRatio on coarse-pointer (touch) devices. Desktop keeps full
  // crispness. The runtime reads window.devicePixelRatio live (boot + resize +
  // transition uniforms), so we shadow the getter for the lifetime of the mounted
  // hero. The exact original own-property descriptor (usually none: the real
  // accessor lives on the Window prototype) is saved up front and restored on
  // unmount, instead of a blind delete that could clobber a pre-existing shadow.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const coarse =
      window.matchMedia('(pointer: coarse)').matches ||
      !window.matchMedia('(pointer: fine)').matches
    if (!coarse || window.devicePixelRatio <= MOBILE_DPR_CAP) return

    const ownDescriptor = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio')
    const protoGet = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(window),
      'devicePixelRatio'
    )?.get
    const realGet = protoGet ?? ownDescriptor?.get
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
        if (ownDescriptor) {
          // Restore the exact descriptor that was on window before the cap.
          Object.defineProperty(window, 'devicePixelRatio', ownDescriptor)
        } else {
          // No own property existed: removing the shadow IS the exact restore,
          // lookup falls through to the prototype accessor again.
          delete (window as unknown as { devicePixelRatio?: number }).devicePixelRatio
        }
      } catch {
        // leave the cap in place if the environment blocks restoration
      }
    }
  }, [])

  // Mount scheduling. The Spline runtime is ~1.3 MB of scene data plus several
  // seconds of (throttled) main-thread scripting, so it must never overlap the
  // initial load: it was the whole reason the home page scored perf 47 while
  // the legal pages scored 95. Two paths bring the live robot in:
  //   a) FAST: the first real user gesture (pointer, wheel, touch, key). An
  //      engaged user gets the robot right away, routed through
  //      requestIdleCallback so the boot lands in a main-thread gap and never
  //      mid-gesture.
  //   b) FALLBACK: no gesture at all. Wait for the window load event plus a
  //      quiet beat, then mount on idle. The dark ambient hero background
  //      carries the space until then, and the runtime never competes with
  //      hydration or the initial chunk work.
  useEffect(() => {
    if (motionOk !== true || !inView || canMountScene) return

    let cancelled = false
    let idleId: number | null = null
    const timeouts: number[] = []

    const win = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }

    const mount = () => {
      if (!cancelled) setCanMountScene(true)
    }

    // Every mount goes through requestIdleCallback with a hard ceiling so the
    // boot waits for a gap but can never stall forever. The ceiling differs by
    // path: the gesture fast-path keeps the original tight 600ms (an engaged
    // user gets the robot right away), the no-gesture fallback allows a longer
    // 1200ms window so the boot stays clear of the Lighthouse/LCP phase.
    const scheduleIdle = (timeout: number) => {
      if (cancelled || idleId !== null) return
      if (win.requestIdleCallback) {
        idleId = win.requestIdleCallback(mount, { timeout })
      } else {
        timeouts.push(window.setTimeout(mount, timeout))
      }
    }

    const INPUT_EVENTS: (keyof WindowEventMap)[] = ['pointerdown', 'mousemove', 'wheel', 'touchstart', 'keydown']
    const onFirstInput = () => {
      detachInput()
      scheduleIdle(600)
    }
    const detachInput = () => {
      for (const ev of INPUT_EVENTS) window.removeEventListener(ev, onFirstInput)
    }
    for (const ev of INPUT_EVENTS) {
      window.addEventListener(ev, onFirstInput, { passive: true })
    }

    // No-gesture post-load beat (v7: 800 -> 2400ms). Long enough that the
    // ~1.3 MB runtime + scene boot never overlaps the load/LCP window on
    // throttled phones, short enough that an idle visitor still sees the live
    // robot in ~2.5-3.5s. Any real gesture short-circuits this via the fast
    // path above, so engaged users are unaffected.
    const afterLoad = () => {
      timeouts.push(window.setTimeout(() => scheduleIdle(1200), 2400))
    }
    if (document.readyState === 'complete') afterLoad()
    else window.addEventListener('load', afterLoad, { once: true })

    return () => {
      cancelled = true
      detachInput()
      window.removeEventListener('load', afterLoad)
      for (const t of timeouts) window.clearTimeout(t)
      if (idleId !== null) win.cancelIdleCallback?.(idleId)
    }
  }, [motionOk, inView, canMountScene])

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

    // Let the real Spline animation play hidden for a short pre-roll before reveal.
    // This avoids exposing the broken first boot pose while keeping the first visible
    // hero moment animated, not static.
    splineApp.play?.()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(() => {
          setSceneReady(true)
          onLoad?.(app)
        }, 420)
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
  // near view. Reduced-motion never mounts the scene: the dark hero stands alone.
  const showScene = motionOk === true && inView && canMountScene

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden hero-spline-stage">
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
