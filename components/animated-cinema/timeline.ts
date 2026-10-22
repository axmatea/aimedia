export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))
export const ease = (value: number, start: number, end: number) => {
  const amount = clamp((value - start) / (end - start))
  return amount * amount * (3 - 2 * amount)
}

export function follow(current: number, target: number, seconds: number) {
  if (Math.abs(current - target) < 0.00001) return target
  return current + (target - current) * (1 - Math.exp(-28 * clamp(seconds, 0, 0.05)))
}

export function frameAt(progress: number, frameCount: number, filmEnd: number) {
  return clamp(progress / filmEnd) * (frameCount - 1)
}

export function frameUrl(root: string, index: number, mobile: boolean) {
  return `${root}/frames/${mobile ? "mobile" : "desktop"}/${String(index).padStart(4, "0")}.webp`
}

export type CameraKey = { at: number; scale: number; centerX: number; centerY: number; immersion?: number }
export function framingAt(progress: number, keys: readonly CameraKey[]) {
  const next = keys.findIndex(key => key.at >= progress)
  if (next <= 0) {
    const key = keys[next === 0 ? 0 : keys.length - 1]
    return { scale: key.scale, centerX: key.centerX, centerY: key.centerY, immersion: clamp(key.immersion ?? 0) }
  }
  const from = keys[next - 1], to = keys[next]
  const blend = ease(progress, from.at, to.at)
  return {
    scale: from.scale + (to.scale - from.scale) * blend,
    centerX: from.centerX + (to.centerX - from.centerX) * blend,
    centerY: from.centerY + (to.centerY - from.centerY) * blend,
    immersion: clamp((from.immersion ?? 0) + ((to.immersion ?? 0) - (from.immersion ?? 0)) * blend),
  }
}

/** Same film rectangle is used for canvas pixels, posters and real HTML labels. */
export function filmRect(width: number, height: number, sourceAspect: number, framing: { scale: number; centerX: number; centerY: number; immersion?: number }) {
  // At zero, retain the approved full-entity framing pixel for pixel. Only the
  // art-directed interior may expand to cover, with a continuous centered crop.
  const immersion = clamp(framing.immersion ?? 0)
  const containedWidth = Math.min(Math.min(width, height * sourceAspect) * framing.scale, height * sourceAspect * 0.94)
  const coverWidth = Math.max(width, height * sourceAspect)
  const filmWidth = containedWidth + (coverWidth - containedWidth) * immersion
  const filmHeight = filmWidth / sourceAspect
  const centerX = framing.centerX + (0.5 - framing.centerX) * immersion
  const centerY = framing.centerY + (0.5 - framing.centerY) * immersion
  return { x: width * centerX - filmWidth / 2, y: height * centerY - filmHeight / 2, width: filmWidth, height: filmHeight }
}

/** OS reduced motion is three deliberate stills, never a hidden frame download. */
export function posterWeights(progress: number, positions: readonly number[]) {
  const weights = positions.map(() => 0)
  if (progress <= positions[0]) { weights[0] = 1; return weights }
  for (let index = 1; index < positions.length; index++) {
    if (progress <= positions[index]) {
      const blend = ease(progress, positions[index - 1], positions[index])
      weights[index - 1] = 1 - blend
      weights[index] = blend
      return weights
    }
  }
  weights[weights.length - 1] = 1
  return weights
}
