import type { AnalyticsStore } from "./store.mjs"
export function createAnalyticsHandlers(options?: { env?: Record<string, string | undefined>; store?: () => AnalyticsStore; now?: () => number }): {
  POST(request: Request): Promise<Response>
  GET(request: Request): Response
}
export function analyticsPost(request: Request): Promise<Response>
export function analyticsSummary(request: Request): Response
