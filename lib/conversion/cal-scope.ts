import type { StructuredBookingLead } from "./cal-webhook.ts"

const SLUG = /^[a-z0-9][a-z0-9-]{1,119}$/
const USERNAME = /^[a-z0-9][a-z0-9._-]{1,119}$/

export class CalScopeConfigError extends Error {
  readonly code: "cal_scope_unavailable"

  constructor() {
    super("cal_scope_unavailable")
    this.name = "CalScopeConfigError"
    this.code = "cal_scope_unavailable"
  }
}

export type CalScope = {
  eventTypeId: string
  eventTypeSlug: string
  organizerUsername: string
}

export function expectedCalScope(
  env: Record<string, string | undefined> = process.env,
): CalScope {
  const scope = {
    eventTypeId: env.CAL_EVENT_TYPE_ID?.trim() || "",
    eventTypeSlug: env.CAL_EVENT_TYPE_SLUG?.trim().toLowerCase() || "",
    organizerUsername: env.CAL_ORGANIZER_USERNAME?.trim().toLowerCase() || "",
  }
  if (
    !/^\d{1,20}$/.test(scope.eventTypeId)
    || !SLUG.test(scope.eventTypeSlug)
    || !USERNAME.test(scope.organizerUsername)
  ) {
    throw new CalScopeConfigError()
  }
  return scope
}

export function verifyCalBookingScope(
  lead: Pick<StructuredBookingLead, "eventTypeId" | "eventTypeSlug" | "organizerUsername">,
  expected: CalScope,
) {
  return lead.eventTypeId === expected.eventTypeId
    && lead.eventTypeSlug.toLowerCase() === expected.eventTypeSlug
    && lead.organizerUsername.toLowerCase() === expected.organizerUsername
}
