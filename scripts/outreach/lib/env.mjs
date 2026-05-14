import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const WEBSITE_ROOT = path.resolve(__dirname, "..", "..", "..")

function loadOne(file) {
  const fullPath = path.join(WEBSITE_ROOT, file)
  if (!fs.existsSync(fullPath)) return
  const lines = fs.readFileSync(fullPath, "utf8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    value = value.replace(/\\n/g, "\n").trim()
    if (!process.env[key]) process.env[key] = value
  }
}

/**
 * Load env in priority order. Later files do NOT override values
 * already populated by earlier files or the real shell environment.
 */
export function loadEnv() {
  loadOne(".env.verify.local")
  loadOne(".env.production.local")
  loadOne(".env.local")
  loadOne(".env")
}

export function requireEnv(key, hint) {
  const v = process.env[key]
  if (!v || v.length === 0) {
    throw new Error(`Missing required env: ${key}${hint ? ` — ${hint}` : ""}`)
  }
  return v
}

export function optionalEnv(key, fallback = "") {
  return process.env[key] || fallback
}
