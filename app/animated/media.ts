/**
 * One asset manifest for the Animated Experience.
 *
 * `entityThroughCore` is the deliberate bridge slot between the external
 * entity master and the internal core/orchestration master. A replacement can
 * be dropped into the same desktop/mobile paths without touching scroll logic.
 * See docs/animated-experience-generation.md for the locked frame contract.
 */
export const ANIMATED_MEDIA = {
  entityPoster: "/animated/posters/entity.webp",
  orchestrationPoster: "/animated/posters/orchestration.webp",
  workflowPoster: "/animated/posters/workflow.webp",
  entityThroughCore: {
    desktop: "/animated/video/desktop/entity-through-core.mp4",
    mobile: "/animated/video/mobile/entity-through-core.mp4",
  },
  workflow: {
    desktop: "/animated/video/desktop/orchestration-to-workflow.mp4",
    mobile: "/animated/video/mobile/orchestration-to-workflow.mp4",
  },
} as const
