'use client'

import { Suspense, lazy, useCallback, useEffect, useRef } from 'react'
import type { Application } from '@splinetool/runtime'

const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
  onLoad?: (app: Application) => void
}

// Possible head object names across common Spline robot scenes
const HEAD_NAMES = ['Head', 'head', 'Robot_Head', 'robot_head', 'HEAD', 'Helmet', 'helmet', 'Skull', 'skull']

export function SplineScene({ scene, className, onLoad }: SplineSceneProps) {
  const appRef = useRef<Application | null>(null)
  const headRef = useRef<{ rotation: { x: number; y: number; z: number } } | null>(null)
  const headBaseRotation = useRef({ x: 0, y: 0, z: 0 })
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })

  const handleLoad = useCallback((app: Application) => {
    appRef.current = app
    const canvas = app.canvas

    if (canvas) {
      canvas.style.background = 'transparent'
      canvas.style.backgroundColor = 'transparent'
    }

    // Find head object by trying common names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objects: any[] = (app as any).getAllObjects?.() ?? []

    let headObj = null
    for (const name of HEAD_NAMES) {
      headObj = objects.find((o: { name: string }) => o.name === name)
        ?? (app as any).findObjectByName?.(name)
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

    // Forward global mouse to canvas (activates built-in Spline events too)
    const forwardMouse = (e: MouseEvent) => {
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
    const MAX_Y = 0.45  // radians ~26°
    const MAX_X = 0.25  // radians ~14°
    const LERP  = 0.06  // smoothing factor

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)

      // Lerp current → target
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * LERP
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * LERP

      if (headRef.current) {
        headRef.current.rotation.y = headBaseRotation.current.y + currentRef.current.x * MAX_Y * 2
        headRef.current.rotation.x = headBaseRotation.current.x + currentRef.current.y * MAX_X * -1
      }
    }
    rafRef.current = requestAnimationFrame(animate)

    // Cleanup
    const cleanup = () => {
      window.removeEventListener('mousemove', forwardMouse)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    ;(app as any)._splineCleanup = cleanup

    onLoad?.(app)
  }, [onLoad])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (appRef.current) {
        ;(appRef.current as any)._splineCleanup?.()
      }
    }
  }, [])

  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#FF2D55]/30 border-t-[#FF2D55] rounded-full animate-spin" />
        </div>
      }
    >
      <Spline scene={scene} className={className} onLoad={handleLoad} />
    </Suspense>
  )
}
