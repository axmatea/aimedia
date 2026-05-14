import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.resolve(__dirname, "..", "..", "..", "data", "outreach")

export const STORE_NAMES = ["prospects", "campaigns", "sent", "unsubscribes"]

function storePath(name) {
  return path.join(DATA_DIR, `${name}.json`)
}

function ensureStore(name) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const p = storePath(name)
  if (!fs.existsSync(p)) fs.writeFileSync(p, "[]")
  return p
}

export function readStore(name) {
  const p = ensureStore(name)
  const raw = fs.readFileSync(p, "utf8") || "[]"
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(`Corrupt store: ${name}.json — manual cleanup required`)
  }
}

export function writeStore(name, value) {
  const p = ensureStore(name)
  fs.writeFileSync(p, JSON.stringify(value, null, 2))
}

export function upsertByEmail(name, record) {
  if (!record.email) throw new Error("upsertByEmail: record.email required")
  const email = record.email.toLowerCase().trim()
  const list = readStore(name)
  const idx = list.findIndex((r) => r.email?.toLowerCase().trim() === email)
  const now = new Date().toISOString()
  if (idx === -1) {
    list.push({ ...record, email, createdAt: now, updatedAt: now })
  } else {
    list[idx] = { ...list[idx], ...record, email, updatedAt: now }
  }
  writeStore(name, list)
  return idx === -1 ? "inserted" : "updated"
}

export function findByEmail(name, email) {
  const target = email.toLowerCase().trim()
  return readStore(name).find((r) => r.email?.toLowerCase().trim() === target) || null
}

export function isUnsubscribed(email) {
  return Boolean(findByEmail("unsubscribes", email))
}

export function addUnsubscribe(email, reason = "manual") {
  return upsertByEmail("unsubscribes", { email, reason })
}

export function wasSentTo(email) {
  return Boolean(findByEmail("sent", email))
}

export function recordSent(email, meta) {
  return upsertByEmail("sent", { email, ...meta })
}

export function getDataDir() {
  return DATA_DIR
}
