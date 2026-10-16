import { mkdirSync } from "node:fs"
import { dirname, isAbsolute } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { validEvent } from "./schema.mjs"

const DAY = 86_400_000
const MAX_EVENTS = 1_000_000

export function createAnalyticsStore({ dbPath, environment, now = Date.now, maxEvents = MAX_EVENTS } = {}) {
  let db
  let lastMaintenance = 0
  const health = { recorded: 0, duplicates: 0, errors: 0, rejected: 0 }
  const enabled = Boolean(dbPath && isAbsolute(dbPath) && ["production", "staging"].includes(environment))

  function database() {
    if (!enabled) return null
    if (db) return db
    mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 })
    const opened = new DatabaseSync(dbPath)
    try {
      opened.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA busy_timeout = 2000;
        PRAGMA auto_vacuum = INCREMENTAL;
        CREATE TABLE IF NOT EXISTS analytics_events (
          event_id TEXT PRIMARY KEY,
          environment TEXT NOT NULL CHECK (environment IN ('production', 'staging')),
          name TEXT NOT NULL, visitor_id TEXT, source TEXT NOT NULL,
          campaign TEXT NOT NULL, medium TEXT NOT NULL, path TEXT NOT NULL,
          recorded_at INTEGER NOT NULL
        ) STRICT;
        CREATE INDEX IF NOT EXISTS analytics_env_time ON analytics_events(environment, recorded_at);
        CREATE INDEX IF NOT EXISTS analytics_env_name_time ON analytics_events(environment, name, recorded_at);
        CREATE INDEX IF NOT EXISTS analytics_time ON analytics_events(recorded_at);
      `)
      db = opened
      return db
    } catch (error) { opened.close(); throw error }
  }

  function maintain(opened, timestamp) {
    if (timestamp - lastMaintenance < 3_600_000 && lastMaintenance) return
    opened.prepare("DELETE FROM analytics_events WHERE recorded_at < ?").run(timestamp - 90 * DAY)
    opened.exec("PRAGMA incremental_vacuum(128)")
    lastMaintenance = timestamp
  }

  function record(input) {
    if (!enabled) return { status: "disabled" }
    const event = validEvent(input)
    if (!event) { health.rejected++; return { status: "rejected" } }
    try {
      const opened = database()
      const timestamp = now()
      maintain(opened, timestamp)
      if (opened.prepare("SELECT 1 FROM analytics_events WHERE event_id = ?").get(event.eventId)) {
        health.duplicates++
        return { status: "duplicate" }
      }
      if (opened.prepare("SELECT COUNT(*) AS count FROM analytics_events").get().count >= maxEvents) {
        health.errors++
        return { status: "error" }
      }
      opened.prepare(`INSERT INTO analytics_events
        (event_id, environment, name, visitor_id, source, campaign, medium, path, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        event.eventId, environment, event.name, event.visitorId, event.source,
        event.campaign, event.medium, event.path, timestamp,
      )
      health.recorded++
      return { status: "recorded" }
    } catch { health.errors++; return { status: "error" } }
  }

  function summary({ days = 30, includeQa = false } = {}) {
    if (!enabled) return { status: "disabled" }
    if (!Number.isInteger(days) || days < 1 || days > 90) return { status: "rejected" }
    try {
      const opened = database()
      const timestamp = now()
      maintain(opened, timestamp)
      const from = timestamp - days * DAY
      const filter = `environment = ? AND recorded_at >= ?${includeQa ? "" : " AND source <> 'internal_qa'"}`
      const parameters = [environment, from]
      const events = opened.prepare(`SELECT name, COUNT(*) AS count FROM analytics_events WHERE ${filter} GROUP BY name ORDER BY name`).all(...parameters)
      const sessions = opened.prepare(`SELECT COUNT(DISTINCT visitor_id) AS count FROM analytics_events WHERE ${filter}`).get(...parameters).count
      const sources = opened.prepare(`SELECT source, campaign, medium, name, COUNT(*) AS count FROM analytics_events WHERE ${filter} GROUP BY source, campaign, medium, name ORDER BY count DESC LIMIT 200`).all(...parameters)
      const daily = opened.prepare(`SELECT strftime('%Y-%m-%d', recorded_at / 1000, 'unixepoch') AS day, name, COUNT(*) AS count FROM analytics_events WHERE ${filter} GROUP BY day, name ORDER BY day`).all(...parameters)
      return {
        status: "ok", environment, period: { days, from: new Date(from).toISOString(), through: new Date(timestamp).toISOString() },
        excludesInternalQa: !includeQa, uniqueSessions: sessions,
        events: Object.fromEntries(events.map(row => [row.name, row.count])),
        bySourceCampaign: sources, daily,
        health: { enabled, ...health },
      }
    } catch { health.errors++; return { status: "error", health: { enabled, ...health } } }
  }

  return { record, summary, health: () => ({ enabled, ...health }), close: () => { db?.close(); db = undefined } }
}

let singleton
let singletonConfig
export function getAnalyticsStore() {
  const config = `${process.env.ANALYTICS_DB_PATH || ""}:${process.env.ANALYTICS_ENVIRONMENT || ""}`
  if (!singleton || config !== singletonConfig) {
    singleton?.close()
    singleton = createAnalyticsStore({ dbPath: process.env.ANALYTICS_DB_PATH, environment: process.env.ANALYTICS_ENVIRONMENT })
    singletonConfig = config
  }
  return singleton
}
