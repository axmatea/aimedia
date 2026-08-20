"use client"

import type { ShaderMount as ShaderMountInstance } from "@paper-design/shaders"
import { useEffect, useRef, useState, type ReactNode } from "react"

interface LiquidMetalButtonProps {
  label?: string
  onClick?: () => void
  className?: string
  disabled?: boolean
  viewMode?: "text" | "icon"
  icon?: ReactNode
  pressed?: boolean
  title?: string
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas")
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"))
  } catch {
    return false
  }
}

export function LiquidMetalButton({
  label = "Book a Call",
  onClick,
  className = "",
  disabled = false,
  viewMode = "text",
  icon,
  pressed,
  title,
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])
  const shaderRef = useRef<HTMLDivElement>(null)
  const shaderMountRef = useRef<ShaderMountInstance | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const hoverRef = useRef(false)
  const rippleId = useRef(0)
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  useEffect(() => {
    let cancelled = false
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const timers = timersRef.current

    const mountShader = async () => {
      if (!shaderRef.current || !supportsWebGL()) return

      try {
        const { liquidMetalFragmentShader, ShaderMount } = await import("@paper-design/shaders")
        if (cancelled || !shaderRef.current) return

        shaderMountRef.current?.dispose()
        shaderMountRef.current = new ShaderMount(
          shaderRef.current,
          liquidMetalFragmentShader,
          {
            u_colorBack: [0.015, 0.015, 0.022, 1],
            u_colorTint: [1, 0.12, 0.22, 0.18],
            u_repetition: 4,
            u_softness: 0.5,
            u_shiftRed: 0.3,
            u_shiftBlue: 0.3,
            u_distortion: 0,
            u_contour: 0,
            u_angle: 45,
            u_fit: 2,
            u_scale: 8,
            u_rotation: 0,
            u_originX: 0.5,
            u_originY: 0.5,
            u_worldWidth: 1,
            u_worldHeight: 1,
            u_shape: 1,
            u_isImage: false,
            u_offsetX: 0.1,
            u_offsetY: -0.1,
          },
          { alpha: true, antialias: false, powerPreference: "low-power" },
          motionPreference.matches ? 0 : 0.6,
          0,
          1,
          160_000,
        )
      } catch {
        // The CSS metal surface is the intentional fallback when WebGL is
        // unavailable or a browser refuses an additional GPU context.
      }
    }

    void mountShader()

    const syncMotion = () => {
      shaderMountRef.current?.setSpeed(motionPreference.matches ? 0 : hoverRef.current ? 1 : 0.6)
    }
    motionPreference.addEventListener?.("change", syncMotion)

    return () => {
      cancelled = true
      motionPreference.removeEventListener?.("change", syncMotion)
      shaderMountRef.current?.dispose()
      shaderMountRef.current = null
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const addTimer = (callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer)
      callback()
    }, delay)
    timersRef.current.add(timer)
  }

  const handlePointerEnter = () => {
    hoverRef.current = true
    setIsHovered(true)
    shaderMountRef.current?.setSpeed(1)
  }

  const handlePointerLeave = () => {
    hoverRef.current = false
    setIsHovered(false)
    setIsPressed(false)
    shaderMountRef.current?.setSpeed(0.6)
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return

    shaderMountRef.current?.setSpeed(2.4)
    addTimer(() => shaderMountRef.current?.setSpeed(hoverRef.current ? 1 : 0.6), 300)

    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      const keyboardActivation = event.detail === 0
      const ripple = {
        x: keyboardActivation ? rect.width / 2 : event.clientX - rect.left,
        y: keyboardActivation ? rect.height / 2 : event.clientY - rect.top,
        id: rippleId.current++,
      }
      setRipples((current) => [...current, ripple])
      addTimer(() => setRipples((current) => current.filter((item) => item.id !== ripple.id)), 650)
    }

    onClick?.()
  }

  return (
    <span
      className={`liquid-metal-control ${viewMode === "icon" ? "liquid-metal-control--icon" : "liquid-metal-control--text"} ${className}`}
      data-hovered={isHovered}
      data-pressed={isPressed}
      data-active={pressed}
    >
      <span ref={shaderRef} className="liquid-metal-shader" aria-hidden="true" />
      <span className="liquid-metal-surface" aria-hidden="true" />
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={() => setIsPressed(true)}
        onPointerUp={() => setIsPressed(false)}
        onPointerCancel={() => setIsPressed(false)}
        onBlur={() => setIsPressed(false)}
        disabled={disabled}
        className="liquid-metal-action"
        aria-label={label}
        aria-pressed={pressed}
        title={title}
      >
        <span className="liquid-metal-content">
          {viewMode === "icon" ? icon : label}
        </span>
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="liquid-metal-ripple"
            style={{ left: ripple.x, top: ripple.y }}
            aria-hidden="true"
          />
        ))}
      </button>
    </span>
  )
}
