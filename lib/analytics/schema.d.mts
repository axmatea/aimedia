export type AnalyticsEventName = "page_view" | "landing_viewed" | "primary_cta_clicked" | "booking_opened" | "booking_started" | "booking_completed" | "inquiry_submitted" | "booking_attributed" | "lead_created" | "qualified_lead_created" | "needs_context_lead_created" | "not_icp_lead_created"
export type AnalyticsDimensions = { source?: unknown; campaign?: unknown; medium?: unknown; path?: unknown }
export type SanitizedDimensions = { source: string; campaign: string; medium: string; path: string }
export type ValidAnalyticsEvent = SanitizedDimensions & { name: AnalyticsEventName; eventId: string; visitorId: string | null }
export const BROWSER_EVENTS: readonly AnalyticsEventName[]
export const EVENT_NAMES: readonly AnalyticsEventName[]
export const UUID: RegExp
export function sanitizeDimensions(input?: AnalyticsDimensions): SanitizedDimensions
export function validEvent(input: unknown, browserOnly?: boolean): ValidAnalyticsEvent | null
