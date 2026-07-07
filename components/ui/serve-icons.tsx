/* ── Serve icons: six hand-drawn 48x48 stroke marks for the WHO WE SERVE grid ──
   Rules: stroke currentColor at 1.5px, exactly ONE #FF2D55 accent per icon,
   idle CSS loops defined in globals.css (serve-*), aria-hidden decorative.
*/

export type ServeIconKey = "web3" | "founders" | "agencies" | "dtc" | "enterprise" | "saas"

const S = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
}

export const SERVE_ICONS: Record<ServeIconKey, () => React.ReactElement> = {
  /* Hexagon protocol: orbit nodes with dash-flow connectors, one red node */
  web3: () => (
    <svg viewBox="0 0 48 48" className="serve-icon serve-icon--web3 w-12 h-12" aria-hidden {...S}>
      <path d="M24 7l13.5 7.8v15.6L24 38.2l-13.5-7.8V14.8z" />
      <line className="serve-dash" x1="24" y1="24" x2="35" y2="16" />
      <line className="serve-dash" x1="24" y1="24" x2="13" y2="16" />
      <line className="serve-dash" x1="24" y1="24" x2="24" y2="36" />
      <circle cx="24" cy="24" r="3" />
      <circle cx="13" cy="16" r="2" />
      <circle cx="24" cy="36" r="2" />
      <circle cx="35" cy="16" r="2.5" fill="#FF2D55" stroke="none" />
    </svg>
  ),

  /* Ascending bars with a breakout arrow that draws itself, red arrowhead */
  founders: () => (
    <svg viewBox="0 0 48 48" className="serve-icon serve-icon--founders w-12 h-12" aria-hidden {...S}>
      <path d="M8 42h32" />
      <path d="M13 42v-8" />
      <path d="M22 42V27" />
      <path d="M31 42V20" />
      <path className="serve-draw" pathLength={1} d="M10 28L36 11" />
      <path d="M29 10l7-1-1 7" stroke="#FF2D55" />
    </svg>
  ),

  /* Overlapping lenses inside a slow rotating dashed orbit, red lens dot */
  agencies: () => (
    <svg viewBox="0 0 48 48" className="serve-icon serve-icon--agencies w-12 h-12" aria-hidden {...S}>
      <circle className="serve-rotate" cx="24" cy="24" r="18" strokeDasharray="3 6" opacity="0.55" />
      <circle cx="19.5" cy="24" r="8.5" />
      <circle cx="28.5" cy="24" r="8.5" />
      <circle cx="24" cy="24" r="2" fill="#FF2D55" stroke="none" />
    </svg>
  ),

  /* Price tag with a pulsing red sparkle */
  dtc: () => (
    <svg viewBox="0 0 48 48" className="serve-icon serve-icon--dtc w-12 h-12" aria-hidden {...S}>
      <path d="M25 9h11a2 2 0 0 1 2 2v11a2 2 0 0 1-.6 1.4L23.7 37.1a2 2 0 0 1-2.8 0l-9-9a2 2 0 0 1 0-2.8L25.6 11.6A2 2 0 0 1 25 9z" transform="translate(1 1)" />
      <circle cx="33.5" cy="15.5" r="1.8" />
      <path className="serve-sparkle" d="M11 7l1.4 3.1L15.5 11.5l-3.1 1.4L11 16l-1.4-3.1L6.5 11.5l3.1-1.4z" fill="#FF2D55" stroke="none" />
    </svg>
  ),

  /* 3x3 grid, cells lighting in sequence, one cell locked to red */
  enterprise: () => (
    <svg viewBox="0 0 48 48" className="serve-icon serve-icon--enterprise w-12 h-12" aria-hidden {...S}>
      <rect className="serve-cell" style={{ ["--i" as string]: 0 }} x="8" y="8" width="8" height="8" rx="1.5" />
      <rect className="serve-cell" style={{ ["--i" as string]: 1 }} x="20" y="8" width="8" height="8" rx="1.5" />
      <rect className="serve-cell" style={{ ["--i" as string]: 2 }} x="32" y="8" width="8" height="8" rx="1.5" />
      <rect className="serve-cell" style={{ ["--i" as string]: 3 }} x="8" y="20" width="8" height="8" rx="1.5" />
      <rect className="serve-cell" style={{ ["--i" as string]: 4 }} x="20" y="20" width="8" height="8" rx="1.5" fill="#FF2D55" fillOpacity="0.85" stroke="none" />
      <rect className="serve-cell" style={{ ["--i" as string]: 5 }} x="32" y="20" width="8" height="8" rx="1.5" />
      <rect className="serve-cell" style={{ ["--i" as string]: 6 }} x="8" y="32" width="8" height="8" rx="1.5" />
      <rect className="serve-cell" style={{ ["--i" as string]: 7 }} x="20" y="32" width="8" height="8" rx="1.5" />
      <rect className="serve-cell" style={{ ["--i" as string]: 8 }} x="32" y="32" width="8" height="8" rx="1.5" />
    </svg>
  ),

  /* Browser window with a floating panel, red chrome dot */
  saas: () => (
    <svg viewBox="0 0 48 48" className="serve-icon serve-icon--saas w-12 h-12" aria-hidden {...S}>
      <rect x="6" y="9" width="30" height="25" rx="3" />
      <path d="M6 16h30" />
      <circle cx="10.5" cy="12.5" r="1.2" fill="#FF2D55" stroke="none" />
      <circle cx="15" cy="12.5" r="1.2" fill="currentColor" stroke="none" opacity="0.4" />
      <circle cx="19.5" cy="12.5" r="1.2" fill="currentColor" stroke="none" opacity="0.4" />
      <g className="serve-float">
        <rect x="27" y="25" width="15" height="13" rx="2.5" />
        <path d="M30 30h9" opacity="0.6" />
        <path d="M30 33.5h6" opacity="0.6" />
      </g>
    </svg>
  ),
}
