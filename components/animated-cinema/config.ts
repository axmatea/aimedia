/** One film, one scroll timeline. The media pass only needs to tune this file. */
export const CINEMA = {
  root: "/animated/neural-cortex-v1",
  frameCount: 739,
  fps: 24,
  sourceWidth: 1920,
  sourceHeight: 1080,
  desktopWidth: 1280,
  mobileWidth: 768,
  filmEnd: 0.95,
  // Existing timing envelope now reveals the brain's real HTML agent labels.
  orbit: { enter: 0.75, readable: 0.79, leave: 0.91, exit: 0.945 },
  resolution: { enter: 0.96, readable: 1 },
  phases: [
    { text: "Understand", start: 0.005, end: 0.158 },
    { text: "Route", start: 0.158, end: 0.65 },
    { text: "Coordinate", start: 0.65, end: 0.83 },
    { text: "Act", start: 0.83, end: 0.94 },
  ],
  /** Source-image coordinates, not percentages of a cropped viewport. */
  agents: [
    { name: "Strategy", x: 0.23, y: 0.28 },
    { name: "Research", x: 0.77, y: 0.28 },
    { name: "Content", x: 0.77, y: 0.72 },
    { name: "Outreach", x: 0.77, y: 0.50 },
    { name: "Delivery", x: 0.23, y: 0.72 },
    { name: "Analytics", x: 0.23, y: 0.50 },
    { name: "Orchestrator", x: 0.5, y: 0.50 },
  ],
  framing: {
    desktop: [
      { at: 0, scale: 1, centerX: 0.5, centerY: 0.5 },
      { at: 0.158, scale: 1, centerX: 0.5, centerY: 0.5, immersion: 0 },
      { at: 0.226, scale: 1, centerX: 0.5, centerY: 0.5, immersion: 1 },
      { at: 0.61, scale: 1, centerX: 0.5, centerY: 0.5, immersion: 1 },
      { at: 0.76, scale: 1, centerX: 0.5, centerY: 0.5, immersion: 0 },
      { at: 1, scale: 1, centerX: 0.5, centerY: 0.5 },
    ],
    portrait: [
      { at: 0, scale: 2.2, centerX: 0.5, centerY: 0.48 },
      { at: 0.158, scale: 2.2, centerX: 0.5, centerY: 0.48, immersion: 0 },
      { at: 0.226, scale: 1.35, centerX: 0.5, centerY: 0.48, immersion: 1 },
      { at: 0.61, scale: 1.35, centerX: 0.5, centerY: 0.48, immersion: 1 },
      { at: 0.76, scale: 1.35, centerX: 0.5, centerY: 0.5, immersion: 0 },
      { at: 1, scale: 1.35, centerX: 0.5, centerY: 0.5 },
    ],
  },
} as const

export const POSTERS = [
  { name: "entity", at: 0 },
  { name: "brain", at: 0.82 },
  { name: "signals", at: 0.95 },
] as const
