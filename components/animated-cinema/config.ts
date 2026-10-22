/** One film, one scroll timeline. The media pass only needs to tune this file. */
export const CINEMA = {
  root: "/animated/neural-return",
  frameCount: 481,
  fps: 24,
  sourceWidth: 1920,
  sourceHeight: 1080,
  desktopWidth: 1280,
  mobileWidth: 768,
  filmEnd: 0.95,
  orbit: { enter: 0.44, readable: 0.46, leave: 0.495, exit: 0.52 },
  resolution: { enter: 0.96, readable: 1 },
  phases: [
    { text: "Understand", start: 0.005, end: 0.20 },
    { text: "Route", start: 0.20, end: 0.43 },
    { text: "Coordinate", start: 0.43, end: 0.64 },
    { text: "Act", start: 0.64, end: 0.94 },
  ],
  /** Source-image coordinates, not percentages of a cropped viewport. */
  agents: [
    { name: "Strategy", x: 0.5, y: -0.02 },
    { name: "Research", x: 0.77, y: 0.30 },
    { name: "Content", x: 0.77, y: 0.72 },
    { name: "Outreach", x: 0.5, y: 0.96 },
    { name: "Delivery", x: 0.23, y: 0.72 },
    { name: "Analytics", x: 0.23, y: 0.30 },
    { name: "Orchestrator", x: 0.5, y: 0.80 },
  ],
  framing: {
    desktop: [
      { at: 0, scale: 1, centerX: 0.5, centerY: 0.5 },
      { at: 1, scale: 1, centerX: 0.5, centerY: 0.5 },
    ],
    portrait: [
      { at: 0, scale: 2.2, centerX: 0.5, centerY: 0.48 },
      { at: 0.20, scale: 2.2, centerX: 0.5, centerY: 0.48 },
      { at: 0.42, scale: 1.35, centerX: 0.5, centerY: 0.48 },
      { at: 0.52, scale: 1.35, centerX: 0.5, centerY: 0.48 },
      { at: 0.75, scale: 1, centerX: 0.5, centerY: 0.48 },
      { at: 1, scale: 1, centerX: 0.5, centerY: 0.48 },
    ],
  },
} as const

export const POSTERS = [
  { name: "entity", at: 0 },
  { name: "orchestration", at: 0.475 },
  { name: "workflow", at: 0.95 },
] as const
