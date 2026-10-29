import { validEvent, type AnalyticsEnvironment } from "./schema.ts"

/** Minimal D1 surface, also usable by an offline SQL fixture without Workers globals. */
export type AnalyticsDatabase = {
  prepare(sql: string): { bind(...values: (string | number | null)[]): { run(): Promise<unknown> } }
}

export type AnalyticsRuntime = {
  db: AnalyticsDatabase
  environment: AnalyticsEnvironment
  waitUntil(task: Promise<unknown>): void
}

const RETENTION_MS = 90 * 86_400_000
const lastMaintenance = new WeakMap<AnalyticsDatabase, number>()

export async function recordAnalyticsEvent(runtime: AnalyticsRuntime, input: unknown, now = Date.now()) {
  const event = validEvent(input)
  if (!event) return { status: "rejected" as const }
  try {
    // Database-side uniqueness makes an exact event replay a no-op.
    await runtime.db.prepare(`INSERT OR IGNORE INTO analytics_events
      (event_id, environment, name, visitor_id, source, campaign, medium, path, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      event.eventId, runtime.environment, event.name, event.visitorId,
      event.source, event.campaign, event.medium, event.path, now,
    ).run()
    if (now - (lastMaintenance.get(runtime.db) || 0) >= 3_600_000) {
      lastMaintenance.set(runtime.db, now)
      // Retention is opportunistic, bounded and independent of booking success.
      runtime.waitUntil(runtime.db.prepare("DELETE FROM analytics_events WHERE recorded_at < ?").bind(now - RETENTION_MS).run().catch(() => {}))
    }
    return { status: "accepted" as const }
  } catch { return { status: "unavailable" as const } }
}
