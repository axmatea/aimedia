/**
 * AX Media Company wordmark, rendered as an inline SVG so the text picks up the
 * real document webfonts (Bebas Neue via --font-bebas, Space Grotesk via
 * --font-space). The old raster-style approach loaded /ax-logo-*.svg through
 * <img src>, where page webfonts never apply, so the mark rendered in the Arial
 * fallback and read as separate blocks.
 *
 * One component serves both themes: all text fills use currentColor, so the
 * parent sets the color (ink on light, white on dark). Only the brand slash is
 * a fixed #FF2D55.
 *
 * Geometry is calibrated against measured ink bounds of the shipped fonts
 * (fontTools over the .next woff2 files, upm 1000):
 * - AX, Bebas 118px ls 0.02em: ink x 1.4 to 96.3, cap top y 29.4, baseline 112.
 * - MEDIA, Space Grotesk 500 26px ls 0.24em from x 181: ink right 283.
 * - COMPANY, Space Grotesk 400 13px ls 0.2em from x 181: ink right 257.
 * - viewBox trims to the ink with about 3 units of margin per side, so the
 *   lockup renders flush and large at h-8 / h-11 instead of padded and small.
 *
 * Signature slash (v6.2): one long 24 deg diagonal that strikes THROUGH the
 * letters, not a separator between blocks. It enters low under the A, crosses
 * the X at mid-height (~x96 y83), clears the MEDIA/COMPANY ink, and exits high
 * at the top right. Painted AFTER the text elements so it sits on top.
 */
export function AxWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 26 286 108"
      width={286}
      height={108}
      fill="none"
      role="img"
      aria-label="AX Media Company"
      className={className}
      style={{ userSelect: "none" }}
    >
      <text
        x="0"
        y="112"
        fill="currentColor"
        style={{ fontFamily: "var(--font-bebas)", fontSize: 118, fontWeight: 400, letterSpacing: "0.02em" }}
      >
        AX
      </text>
      <text
        x="181"
        y="106"
        fill="currentColor"
        style={{ fontFamily: "var(--font-space)", fontSize: 26, fontWeight: 500, letterSpacing: "0.24em" }}
      >
        MEDIA
      </text>
      <text
        x="181"
        y="130"
        fill="currentColor"
        opacity="0.5"
        style={{ fontFamily: "var(--font-space)", fontSize: 13, fontWeight: 400, letterSpacing: "0.2em" }}
      >
        COMPANY
      </text>
      {/* Signature strike: 24 deg long diagonal painted over the letters */}
      <line x1="14" y1="120" x2="214" y2="31" stroke="#FF2D55" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}
