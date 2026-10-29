import { readFileSync } from "node:fs"
import DottedMap from "dotted-map"

// Keep the approved original map geometry and colors exactly. This dependency
// is deliberately confined to offline generation/tests, never the client.
export function buildWorldMaps() {
  const map = new DottedMap({ height: 100, grid: "diagonal" })
  return Object.fromEntries([
    ["dark", "#FFFFFF20"],
    ["light", "#00000040"],
  ].map(([theme, color]) => [theme, map.getSVG({
    radius: 0.22,
    color,
    shape: "circle",
    backgroundColor: "transparent",
  })]))
}

// Produce an apply_patch payload rather than modifying files implicitly.
// Usage: node scripts/deployment/precompute-world-map.mjs --patch | apply_patch
if (process.argv.includes("--patch")) {
  const patches = ["*** Begin Patch"]
  for (const [theme, svg] of Object.entries(buildWorldMaps())) {
    const path = `public/maps/world-v1-${theme}.svg`
    try {
      if (readFileSync(new URL(`../../${path}`, import.meta.url), "utf8") === `${svg}\n`) continue
      throw new Error(`Refusing to overwrite ${path}; create a versioned export instead`)
    } catch (error) {
      if (error.code !== "ENOENT") throw error
    }
    patches.push(`*** Add File: ${path}`, ...`${svg}\n`.trimEnd().split("\n").map(line => `+${line}`))
  }
  patches.push("*** End Patch")
  process.stdout.write(`${patches.join("\n")}\n`)
}
