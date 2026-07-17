/**
 * Shared presentational primitives for the home page (v7.2 islands refactor).
 *
 * NO "use client" directive on purpose: these are pure, hook-free components.
 * Rendered from the server page shell they produce zero client JS; rendered
 * inside a client island they compile into that island's bundle. Same markup
 * either way.
 */

import Image from "next/image"

export const Disp = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <span className={`font-display leading-none tracking-wide uppercase ${className}`} style={{ fontFamily: "var(--font-bebas)", ...style }}>
    {children}
  </span>
)

/**
 * AmbientImage: decorative, heavily dimmed and edge-masked fragment of the
 * generated outcome imagery, used as background atmosphere behind sections.
 * Dark theme only (the renders are dark scenes; on the light theme they read
 * as gray smudges, so CSS hides them there). Lazy, below the fold, aria-hidden:
 * never part of LCP and never in the accessibility tree.
 * v7.1: placements point at the tiny pre-blurred 720px variants
 * (public/generated/outcomes/blur/): heavily dimmed + masked atmosphere never
 * needs the full-res renders, and the baked blur costs the GPU nothing.
 */
export const AmbientImage = ({ src, className = "" }: { src: string; className?: string }) => (
  <div className={`ambient-image ${className}`.trim()} aria-hidden>
    <Image src={src} alt="" fill sizes="50vw" loading="lazy" className="ambient-image-img" />
  </div>
)

// Eyebrow pill: plain section label, no per-section slash (the wordmark carries the motif)
export const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 border rounded-full ai-tag">
    {children}
  </span>
)
