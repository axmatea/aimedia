/** One film, one scroll timeline. The media pass only needs to tune this file. */
export const CINEMA = {
  root: "/animated/inner-system-v1",
  frameCount: 836,
  fps: 24,
  sourceWidth: 1920,
  sourceHeight: 1080,
  desktopWidth: 1280,
  mobileWidth: 768,
  filmEnd: 0.95,
  orbit: { enter: 0.628, readable: 0.648, leave: 0.673, exit: 0.690 },
  resolution: { enter: 0.96, readable: 1 },
  phases: [
    { text: "Understand", start: 0.005, end: 0.14 },
    { text: "Route", start: 0.14, end: 0.49 },
    { text: "Coordinate", start: 0.49, end: 0.80 },
    { text: "Act", start: 0.80, end: 0.94 },
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
      { at: 0.14, scale: 1, centerX: 0.5, centerY: 0.5, immersion: 0 },
      { at: 0.20, scale: 1, centerX: 0.5, centerY: 0.5, immersion: 1 },
      { at: 0.40, scale: 1, centerX: 0.5, centerY: 0.5, immersion: 1 },
      { at: 0.49, scale: 1, centerX: 0.5, centerY: 0.5, immersion: 0 },
      { at: 1, scale: 1, centerX: 0.5, centerY: 0.5 },
    ],
    portrait: [
      { at: 0, scale: 2.2, centerX: 0.5, centerY: 0.48 },
      { at: 0.14, scale: 2.2, centerX: 0.5, centerY: 0.48, immersion: 0 },
      { at: 0.20, scale: 1.35, centerX: 0.5, centerY: 0.48, immersion: 1 },
      { at: 0.40, scale: 1.35, centerX: 0.5, centerY: 0.48, immersion: 1 },
      { at: 0.49, scale: 2.2, centerX: 0.5, centerY: 0.48, immersion: 0 },
      { at: 0.63, scale: 1.35, centerX: 0.5, centerY: 0.48 },
      { at: 0.72, scale: 1.35, centerX: 0.5, centerY: 0.48 },
      { at: 0.85, scale: 1, centerX: 0.5, centerY: 0.48 },
      { at: 1, scale: 1, centerX: 0.5, centerY: 0.48 },
    ],
  },
} as const

export const POSTERS = [
  { name: "entity", at: 0 },
  { name: "orchestration", at: 0.669 },
  { name: "workflow", at: 0.95 },
] as const
