import "server-only"
import type { BookingDeadline } from "./booking-deadline.ts"

import type { StructuredBookingLead } from "@/lib/conversion/cal-webhook"
import { buildMetaLeadEvent } from "@/lib/conversion/meta-capi-contract"
import type { MetaAttributionMapping } from "@/lib/conversion/meta-attribution-allowlist"

type MetaCapiResponse = {
  events_received?: number
  messages?: string[]
  fbtrace_id?: string
  error?: { code?: number; error_subcode?: number }
}

function config() {
  const datasetId = process.env.META_DATASET_ID?.trim() || ""
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim() || ""
  const apiVersion = process.env.META_GRAPH_API_VERSION?.trim() || ""
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim() || ""

  if (!/^\d{6,32}$/.test(datasetId)) throw new Error("META_DATASET_ID is not configured")
  if (accessToken.length < 32) throw new Error("META_CAPI_ACCESS_TOKEN is not configured")
  if (!/^v\d+\.\d+$/.test(apiVersion)) throw new Error("META_GRAPH_API_VERSION is not configured")
  return { datasetId, accessToken, apiVersion, testEventCode }
}

export async function sendMetaLeadEvent(
  lead: StructuredBookingLead,
  attribution: MetaAttributionMapping,
  deadline: BookingDeadline,
) {
  const { datasetId, accessToken, apiVersion, testEventCode } = config()
  const event = buildMetaLeadEvent(lead, attribution)
  const response = await deadline.fetch(`https://graph.facebook.com/${apiVersion}/${datasetId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [event],
      access_token: accessToken,
      ...(testEventCode ? { test_event_code: testEventCode } : {}),
    }),
    cache: "no-store",
  })
  const body = await deadline.json(response).catch((error) => { deadline.check(); throw error }) as MetaCapiResponse
  if (!response.ok || body.error || body.events_received !== 1) {
    const code = body.error?.code ? ` code=${body.error.code}` : ""
    const subcode = body.error?.error_subcode ? ` subcode=${body.error.error_subcode}` : ""
    throw new Error(`Meta Lead delivery failed (${response.status}${code}${subcode})`)
  }
  return { eventId: event.event_id, eventsReceived: 1 as const }
}
