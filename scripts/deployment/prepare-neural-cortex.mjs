import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseArguments, prepareInnerSystem } from "./prepare-inner-system.mjs"

const SOURCE_ROOT = "artifacts/animated-experience/neural-cortex-source"

export function parseCortexArguments(args) {
  for (const arg of args) if (arg !== "--help" && !arg.startsWith("--movie=") && !arg.startsWith("--brain-frame=")) throw new Error(`Unknown argument: ${arg.split("=")[0]}`)
  const parsed = parseArguments(args.map(arg => arg.startsWith("--brain-frame=") ? `--orbit-frame=${arg.slice(14)}` : arg))
  const result = {}
  if (parsed.movie !== undefined) result.movie = parsed.movie
  if (parsed.orbitFrame !== undefined) result.brainFrame = parsed.orbitFrame
  if (parsed.help !== undefined) result.help = parsed.help
  return result
}

export function prepareNeuralCortex({ root = process.cwd(), movie, brainFrame } = {}) {
  return prepareInnerSystem({
    root,
    movie: movie ?? path.join(SOURCE_ROOT, "neural-cortex-master.mkv"),
    orbitFrame: brainFrame,
    sourceRoot: SOURCE_ROOT,
    targetRoot: "public/animated/neural-cortex-v1",
    posterNames: { entity: "entity", orchestration: "brain", workflow: "signals" },
    reviewName: "neural-cortex-review.mp4",
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseCortexArguments(process.argv.slice(2))
    if (args.help) console.log("Usage: node scripts/deployment/prepare-neural-cortex.mjs [--movie=<local path>] [--brain-frame=<zero-based index>]\nDefault master: artifacts/animated-experience/neural-cortex-source/neural-cortex-master.mkv\nDefault brain still: midpoint frame. Output: public/animated/neural-cortex-v1 (must not exist).")
    else console.log(JSON.stringify(await prepareNeuralCortex(args)))
  } catch (error) { console.error(`Neural Cortex preparation failed: ${error.message}`); process.exitCode = 1 }
}
