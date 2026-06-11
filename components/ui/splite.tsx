'use client'

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { Application } from '@splinetool/runtime'

const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
  onLoad?: (app: Application) => void
  /** Optional static fallback image for mobile (saves ~5s LCP on phones) */
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

// Possible head object names across common Spline robot scenes
const HEAD_NAMES = ['Head', 'head', 'Robot_Head', 'robot_head', 'HEAD', 'Helmet', 'helmet', 'Skull', 'skull']

export function SplineScene({ scene, className, onLoad, mobileFallback }: SplineSceneProps) {
  const [isMobile, setIsMobile] = useState(false)
  const interactiveRef = useRef(true)
  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 768px)')
    const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const syncViewportState = () => {
      setIsMobile(mobileQuery.matches)
      interactiveRef.current = finePointerQuery.matches && !reducedMotionQuery.matches
    }

    syncViewportState()

    const addChangeListener = (query: MediaQueryList, handler: () => void) => {
      query.addEventListener?.('change', handler)
      return () => query.removeEventListener?.('change', handler)
    }

    const cleanups = [
      addChangeListener(mobileQuery, syncViewportState),
      addChangeListener(finePointerQuery, syncViewportState),
      addChangeListener(reducedMotionQuery, syncViewportState),
    ]

    return () => {
      cleanups.forEach((cleanup) => cleanup())
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

    onLoad?.(app)
  }, [onLoad])

  // Pause Spline animation loop when off-screen to save GPU
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
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.05 }
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

  // On mobile with a fallback image: skip the entire 3D scene → saves ~5s LCP
  if (isMobile && mobileFallback) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mobileFallback} alt="" className={className} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#FF2D55]/30 border-t-[#FF2D55] rounded-full animate-spin" />
          </div>
        }
      >
        <Spline scene={scene} className={className} onLoad={handleLoad} />
      </Suspense>
    </div>
  )
}
