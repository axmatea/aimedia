"use client"

import { motion } from "framer-motion"

function FloatingPaths({ position, color = "rgba(255,45,85," }: { position: number; color?: string }) {
  const paths = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    opacity: 0.06 + i * 0.018,
    width: 0.4 + i * 0.025,
  }))

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 696 316" fill="none">
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke={`${color}${path.opacity})`}
            strokeWidth={path.width}
            initial={{ pathLength: 0.3, opacity: 0.5 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 18 + path.id * 0.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  )
}

export function BackgroundPaths({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[#050507] ${className}`}>
      <div className="absolute inset-0">
        <FloatingPaths position={1} color="rgba(255,45,85," />
        <FloatingPaths position={-1} color="rgba(123,47,255," />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}
