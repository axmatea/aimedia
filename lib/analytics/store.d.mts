export type RecordResult = { status: "disabled" | "rejected" | "duplicate" | "recorded" | "error" }
export type AnalyticsHealth = { enabled: boolean; recorded: number; duplicates: number; errors: number; rejected: number }
export type AnalyticsSummary = Record<string, unknown> & { status: string }
export type AnalyticsStore = {
  record(input: unknown): RecordResult
  summary(options?: { days?: number; includeQa?: boolean }): AnalyticsSummary
  health(): AnalyticsHealth
  close(): void
}
export function createAnalyticsStore(options?: { dbPath?: string; environment?: string; now?: () => number; maxEvents?: number }): AnalyticsStore
export function getAnalyticsStore(): AnalyticsStore
