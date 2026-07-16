"use client"

import Image from "next/image"
import { m, useReducedMotion } from "motion/react"

/* Mirrored from proof-section.tsx so the two files stay import-cycle free. */
const VP = { once: true, margin: "0px 0px -80px 0px" } as const
const EASE_SWIFT: [number, number, number, number] = [0.2, 0.8, 0.2, 1]

/*
 * Tiny shared SVG placeholder (~0.2KB, one constant for every instance).
 * Paints the frame in the site's dark gradient while the lazy image decodes.
 * Chosen over per-image base64 blurs: those cost ~1.5KB each in the page
 * payload and these frames already sit inside styled containers.
 */
const FRAME_PLACEHOLDER = ("data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="3" height="2"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#15151c"/><stop offset="100%" stop-color="#07070a"/></linearGradient></defs><rect width="3" height="2" fill="url(#g)"/></svg>'
  )) as `data:image/${string}`

export type ShowcaseMediaProps = {
  src: string
  alt: string
  /** Small pill row rendered in-frame, e.g. ["Higgsfield", "2K", "3:2"]. */
  spec?: string[]
  /** Short editorial line shown with the chips in the reveal overlay. */
  caption?: string
  /** CSS aspect-ratio. Pass "auto" when an absolutely sized parent frames it. */
  aspect?: string
  /**
   * Below-the-fold lazy by default. Only flip for above-the-fold placements,
   * never in showcase grids: they must not compete with the hero LCP.
   * Next 16 deprecated the next/image `priority` prop, so this maps to
   * loading="eager" + fetchPriority="high" instead.
   */
  priority?: boolean
  sizes?: string
  className?: string
}

/**
 * ShowcaseMedia: framed editorial imagery (Higgsfield renders).
 * Fade+rise on scroll into view, hover reveal (scale + caption/spec overlay)
 * gated to precise hover devices in globals.css so touch stays clean.
 */
export function ShowcaseMedia({
  src,
  alt,
  spec,
  caption,
  aspect = "3/2",
  priority = false,
  sizes = "(max-width: 620px) 100vw, (max-width: 1120px) 50vw, 25vw",
  className = "",
}: ShowcaseMediaProps) {
  const reducedMotion = useReducedMotion()
  const hasSpec = Boolean(spec && spec.length > 0)
  return (
    <m.figure
      className={`showcase-media ${className}`.trim()}
      style={{ aspectRatio: aspect }}
      initial={reducedMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VP}
      transition={{ duration: 0.85, ease: EASE_SWIFT }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        placeholder={FRAME_PLACEHOLDER}
        className="showcase-media-img"
      />
      {(caption || hasSpec) && (
        <figcaption className="showcase-media-overlay">
          {caption && <span className="showcase-media-caption">{caption}</span>}
          {hasSpec && (
            <span className="showcase-media-chips">
              {spec?.map((item) => (
                <span key={item} className="showcase-media-chip">
                  {item}
                </span>
              ))}
            </span>
          )}
        </figcaption>
      )}
    </m.figure>
  )
}
