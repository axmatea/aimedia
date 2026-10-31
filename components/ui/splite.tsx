'use client'

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { preload } from 'react-dom'
import type { Application } from '@splinetool/runtime'

const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
  onLoad?: (app: Application) => void
  onReadyChange?: (ready: boolean) => void
}

type SaveDataConnection = {
  saveData?: boolean
  addEventListener?: (name: 'change', listener: () => void) => void
  removeEventListener?: (name: 'change', listener: () => void) => void
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

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

// Possible head object names across common Spline robot scenes
const HEAD_NAMES = ['Head', 'head', 'Robot_Head', 'robot_head', 'HEAD', 'Helmet', 'helmet', 'Skull', 'skull']

// Self-hosted runtime wasm base (v7.1). The runtime's Application constructor
// accepts { wasmPath } (react-spline forwards the prop) and resolves helper
// binaries as `${wasmPath}/<name>.wasm` instead of unpkg.com. The baked hero no
// longer needs modelling WASM. The original/v1 scenes remain compatible through:
//   public/spline/process.wasm  (from @splinetool/modelling-wasm@1.12.70/build)
// It has no BooleanGeometry / navmesh / draco-compressed buffers (verified by
// scanning the .splinecode), so boolean.wasm, navmesh.wasm, and the draco
// decoder are never requested. CAUTION: wasmPath also overrides the draco
// decoder base, so if a future scene ships draco-compressed geometry, copy the
// gstatic draco 1.5.2 decoder files into public/spline/ as well. Keep the wasm
// version in lockstep with the installed @splinetool/runtime version.
const SPLINE_WASM_PATH = '/spline'

// Local User Timing entries let performance traces distinguish real robot
// startup from the earlier server-rendered headline/poster. No network, user
// identifiers or analytics payloads are created here.
function markRobotTiming(phase: 'requested' | 'loaded' | 'ready') {
  if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
    performance.mark(`aimedia:robot:${phase}`)
  }
}

export function SplineScene({ scene, className, onLoad, onReadyChange }: SplineSceneProps) {
  // The server-rendered poster stays until the live scene is ready; then the
  // authored 3D scene fades and settles in with its original pose pre-roll.
  const [sceneReady, setSceneReady] = useState(false)
  // Respect explicit reduced-motion and Save-Data preferences. Neither mode
  // imports the heavy live runtime; the approved server-rendered poster stays.
  const [motionOk, setMotionOk] = useState<boolean | null>(null)
  const motionAllowedRef = useRef(false)
  // Lazy init: only mount the Spline runtime once the hero is near the viewport.
  const [inView, setInView] = useState(false)
  const [pageVisible, setPageVisible] = useState(false)
  // Heavy Spline runtime starts after the first paint, without a fixed waiting
  // period. The server-rendered poster remains until the real scene is ready.
  const [canMountScene, setCanMountScene] = useState(false)
  // Head mouse-follow lerp only runs on fine-pointer (cursor) devices. On touch the
  // scene still plays its own idle animation, we just skip the wasted pointer work.
  const interactiveRef = useRef(true)
  const appRef = useRef<SplineApp | null>(null)
  const visibleRef = useRef(false)
  const startLerpRef = useRef<(() => void) | null>(null)
  const headRef = useRef<{ rotation: { x: number; y: number; z: number } } | null>(null)
  const headBaseRotation = useRef({ x: 0, y: 0, z: 0 })
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as Navigator & { connection?: SaveDataConnection }).connection
    const webGLAvailable = supportsWebGL()

    const syncMotion = () => {
      const allowed = webGLAvailable && !reducedMotionQuery.matches && !connection?.saveData
      motionAllowedRef.current = allowed
      setMotionOk(allowed)
      if (!allowed) {
        // Stop immediately, then let React Spline dispose the renderer on
        // unmount. Cancel our own listeners, pending reveal and pointer frames.
        appRef.current?.stop?.()
        appRef.current?._splineCleanup?.()
        appRef.current = null
        headRef.current = null
        setSceneReady(false)
        onReadyChange?.(false)
      }
    }
    const syncInteractive = () => {
      interactiveRef.current = finePointerQuery.matches && motionAllowedRef.current
      if (!interactiveRef.current && rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }

    syncMotion()
    syncInteractive()

    const onPreference = () => {
      syncMotion()
      syncInteractive()
    }
    const onPointer = () => syncInteractive()

    reducedMotionQuery.addEventListener?.('change', onPreference)
    connection?.addEventListener?.('change', onPreference)
    finePointerQuery.addEventListener?.('change', onPointer)

    return () => {
      motionAllowedRef.current = false
      reducedMotionQuery.removeEventListener?.('change', onPreference)
      connection?.removeEventListener?.('change', onPreference)
      finePointerQuery.removeEventListener?.('change', onPointer)
    }
  }, [onReadyChange])

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

  // Start after one post-hydration paint, then use an idle gap when available.
  // No 200ms beat or 500ms fallback wait: unsupported requestIdleCallback must
  // not make phones wait longer. Input and default paths share one mount gate.
  useEffect(() => {
    if (motionOk !== true || !inView || !pageVisible || canMountScene) return

    let cancelled = false
    let scheduled = false
    let idleId: number | null = null
    let paintFrame: number | null = null
    const timeouts: number[] = []

    const win = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }

    const mount = () => {
      if (!cancelled) {
        markRobotTiming('requested')
        // Download scene bytes alongside the lazy runtime rather than waiting
        // for that JavaScript to parse and discover them. Same credentials/cache
        // mode as Application.load; no import/fetch in reduced-motion/Save-Data.
        preload(scene, { as: 'fetch', crossOrigin: 'anonymous', fetchPriority: 'low' })
        setCanMountScene(true)
      }
    }

    const scheduleIdle = (timeout: number) => {
      if (cancelled || scheduled) return
      scheduled = true
      if (win.requestIdleCallback) {
        idleId = win.requestIdleCallback(mount, { timeout })
      } else {
        timeouts.push(window.setTimeout(mount, 0))
      }
    }

    const INPUT_EVENTS: (keyof WindowEventMap)[] = ['pointerdown', 'mousemove', 'wheel', 'touchstart', 'keydown']
    const onFirstInput = () => {
      detachInput()
      scheduleIdle(300)
    }
    const detachInput = () => {
      for (const ev of INPUT_EVENTS) window.removeEventListener(ev, onFirstInput)
    }
    for (const ev of INPUT_EVENTS) {
      window.addEventListener(ev, onFirstInput, { passive: true })
    }

    // A task scheduled from rAF runs after that paint, not inside its rendering
    // work. The live renderer still retains its authored 420ms pose pre-roll.
    paintFrame = requestAnimationFrame(() => {
      timeouts.push(window.setTimeout(() => scheduleIdle(150), 0))
    })

    return () => {
      cancelled = true
      detachInput()
      if (paintFrame !== null) cancelAnimationFrame(paintFrame)
      for (const t of timeouts) window.clearTimeout(t)
      if (idleId !== null) win.cancelIdleCallback?.(idleId)
    }
  }, [motionOk, inView, pageVisible, canMountScene, scene])

  const handleLoad = useCallback((app: Application) => {
    const splineApp = app as SplineApp
    // A scene request may finish after a live preference change/unmount.
    // Never reveal or restart that stale renderer over the static fallback.
    if (!motionAllowedRef.current) {
      splineApp.stop?.()
      return
    }
    markRobotTiming('loaded')
    appRef.current?._splineCleanup?.()
    appRef.current = splineApp
    const canvas = splineApp.canvas
    headRef.current = null

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

    // Keep Spline's authored idle animation. Our additional head-follow loop is
    // event-driven and stops once settled instead of running another RAF forever.
    const MAX_Y = 0.6
    const MAX_X = 0.4
    const LERP = 0.08
    const EPSILON = 0.0005
    const hasPendingMovement = () =>
      Math.abs(targetRef.current.x - currentRef.current.x) > EPSILON ||
      Math.abs(targetRef.current.y - currentRef.current.y) > EPSILON
    const animate = () => {
      rafRef.current = null
      const head = headRef.current
      if (!head || !visibleRef.current || !interactiveRef.current) return
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * LERP
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * LERP
      head.rotation.y = headBaseRotation.current.y + currentRef.current.x * MAX_Y * 2
      head.rotation.x = headBaseRotation.current.x + currentRef.current.y * MAX_X
      if (hasPendingMovement()) rafRef.current = requestAnimationFrame(animate)
    }
    const startLerp = () => {
      if (headRef.current && visibleRef.current && interactiveRef.current &&
          hasPendingMovement() && rafRef.current === null) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    startLerpRef.current = startLerp
    const forwardMouse = (event: MouseEvent) => {
      if (!visibleRef.current || !interactiveRef.current) return
      canvas?.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: false, cancelable: true,
        clientX: event.clientX, clientY: event.clientY,
        screenX: event.screenX, screenY: event.screenY,
        movementX: event.movementX, movementY: event.movementY,
      }))
      targetRef.current = {
        x: event.clientX / window.innerWidth - 0.5,
        y: event.clientY / window.innerHeight - 0.5,
      }
      startLerp()
    }
    window.addEventListener('mousemove', forwardMouse, { passive: true })

    let revealFrame: number | null = null
    let revealTimer: number | null = null

    // Cleanup
    const cleanup = () => {
      window.removeEventListener('mousemove', forwardMouse)
      if (revealFrame !== null) cancelAnimationFrame(revealFrame)
      if (revealTimer !== null) window.clearTimeout(revealTimer)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (startLerpRef.current === startLerp) startLerpRef.current = null
    }
    splineApp._splineCleanup = cleanup

    // Let the real Spline animation play hidden for a short pre-roll before reveal.
    // This avoids exposing the broken first boot pose while keeping the first visible
    // hero moment animated, not static.
    if (visibleRef.current) splineApp.play?.()
    else splineApp.stop?.()
    revealFrame = requestAnimationFrame(() => {
      revealFrame = requestAnimationFrame(() => {
        revealTimer = window.setTimeout(() => {
          if (!motionAllowedRef.current) return
          markRobotTiming('ready')
          setSceneReady(true)
          onReadyChange?.(true)
          onLoad?.(app)
        }, 420)
      })
    })
  }, [onLoad, onReadyChange])

  // Lazy-init when near the viewport, then pause the render loop when off-screen.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let intersecting = false
    const syncActivity = () => {
      const active = intersecting && !document.hidden
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
    const preloadObserver = new IntersectionObserver(
      ([entry]) => {
        // Mount the runtime once when it first approaches view, keep it mounted
        // afterwards so scrolling does not trigger an expensive reload.
        if (entry.isIntersecting) setInView(true)
      },
      // rootMargin preloads slightly before the hero scrolls in
      { threshold: 0.05, rootMargin: '200px' }
    )
    preloadObserver.observe(el)
    // Preloading near view and rendering in view are separate conditions. The
    // preload margin must not keep a GPU animation alive below the viewport.
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting
      syncActivity()
    }, { threshold: 0.05 })
    visibilityObserver.observe(el)
    // Pause everything when the tab is hidden (battery / thermal)
    const onVis = () => {
      setPageVisible(!document.hidden)
      syncActivity()
    }
    onVis()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      preloadObserver.disconnect()
      visibilityObserver.disconnect()
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
            <Spline scene={scene} wasmPath={SPLINE_WASM_PATH} className={className} onLoad={handleLoad} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
