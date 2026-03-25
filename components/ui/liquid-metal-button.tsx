"use client"

import { useState, useRef } from "react"

interface LiquidMetalButtonProps {
  label?: string
  onClick?: () => void
  className?: string
}

export function LiquidMetalButton({ label = "Book a Call", onClick, className = "" }: LiquidMetalButtonProps) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])
  const rippleId = useRef(0)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const ripple = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: rippleId.current++ }
      setRipples((prev) => [...prev, ripple])
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)), 700)
    }
    onClick?.()
  }

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      className={`liquid-metal-btn relative overflow-hidden rounded-full px-9 py-3.5 text-sm font-semibold transition-transform hover:scale-[1.03] active:scale-[0.97] ${className}`}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: r.x,
            top: r.y,
            width: 8,
            height: 8,
            transform: "translate(-50%,-50%) scale(0)",
            background: "rgba(255,255,255,0.6)",
            animation: "metal-ripple 0.7s ease-out forwards",
          }}
        />
      ))}
      <span className="relative z-10">{label}</span>
    </button>
  )
}
