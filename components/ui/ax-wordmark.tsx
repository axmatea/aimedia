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
 * - Slash ink: x about 111 to 169 (24 deg brand angle, dx 52 dy -24, stroke 6
 *   round). Gap AX-to-slash 14.7, slash-to-MEDIA 13.9: visually even.
 * - MEDIA, Space Grotesk 500 26px ls 0.24em from x 181: ink right 283.
 * - COMPANY, Space Grotesk 400 13px ls 0.2em from x 181: ink right 257.
 * - viewBox trims to the ink with about 3 units of margin per side, so the
 *   lockup renders flush and large at h-8 / h-11 instead of padded and small.
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
      {/* Signature slash: 24 deg per brand system */}
      <line x1="114" y1="116" x2="166" y2="92" stroke="#FF2D55" strokeWidth="6" strokeLinecap="round" />
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
    </svg>
  )
}
