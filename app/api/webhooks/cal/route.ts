import { NextRequest, NextResponse } from "next/server"
import { BookingBodyTooLargeError, BookingDeadline } from "@/lib/conversion/booking-deadline"
import { track } from "@vercel/analytics/server"
import {
  isCalWebhookPing,
  MAX_CAL_WEBHOOK_BYTES,
  parseCalBookingLead,
  verifyCalWebhookSignature,
} from "@/lib/conversion/cal-webhook"
import {
  markMetaLeadSent,
  upsertBookingLead,
} from "@/lib/conversion/notion-bookings"
import { sendMetaLeadEvent } from "@/lib/conversion/meta-capi"
import {
  expectedCalScope,
  verifyCalBookingScope,
} from "@/lib/conversion/cal-scope"
import { verifyMetaAttribution } from "@/lib/conversion/meta-attribution-allowlist"

export const runtime = "nodejs"
// Keep webhook execution bounded. Interrupted reservations remain fail-closed
// until the dedicated D1 service's exact-pair stale-recovery lease elapses.
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const deadline = new BookingDeadline({ signal: request.signal })
  try {
    return await deadline.wait(() => handleBooking(request, deadline))
  } catch (error) {
    if (error instanceof BookingBodyTooLargeError) {
      return NextResponse.json({ error: "request too large" }, { status: 413 })
    }
    return NextResponse.json({ error: "booking processing failed" }, { status: 502 })
  } finally {
    deadline.dispose()
  }
}

async function handleBooking(request: NextRequest, deadline: BookingDeadline) {
  const length = Number(request.headers.get("content-length") || 0)
  if (Number.isFinite(length) && length > MAX_CAL_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "request too large" }, { status: 413 })
  }

  const secret = process.env.CAL_WEBHOOK_SECRET?.trim() || ""
  if (secret.length < 32) {
    return NextResponse.json({ error: "webhook unavailable" }, { status: 503 })
  }

  const rawBody = await deadline.readBody(request, MAX_CAL_WEBHOOK_BYTES)
  if (Buffer.byteLength(rawBody, "utf8") > MAX_CAL_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "request too large" }, { status: 413 })
  }
  if (!verifyCalWebhookSignature({
    rawBody,
    signature: request.headers.get("x-cal-signature-256"),
    secret,
  })) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }

  // Cal.com validates a subscriber URL with a signed PING before allowing the
  // webhook to be created. A ping proves reachability and must never create a lead.
  if (isCalWebhookPing(rawBody)) {
    return NextResponse.json({ ok: true, triggerEvent: "PING" })
  }

  const parsed = parseCalBookingLead(rawBody)
  if (!parsed.ok) {
    const status = parsed.error === "unsupported_trigger" ? 422 : 400
    return NextResponse.json({ error: parsed.error }, { status })
  }

  let scope
  try {
    scope = expectedCalScope()
  } catch {
    return NextResponse.json({ error: "webhook scope unavailable" }, { status: 503 })
  }
  if (!verifyCalBookingScope(parsed.lead, scope)) {
    return NextResponse.json({ error: "webhook scope mismatch" }, { status: 403 })
  }

  try {
    const metaAttribution = verifyMetaAttribution(parsed.lead)
    const result = await upsertBookingLead(parsed.lead, metaAttribution, deadline)
    let metaLead: "sent" | "already_sent" | "not_applicable" = "not_applicable"
    if (result.metaLeadDelivery.action === "send") {
      if (result.metaAttribution.status !== "VERIFIED") {
        throw new Error("verified Meta attribution is required for Lead delivery")
      }
      const delivery = await sendMetaLeadEvent(
        result.deliveryLead,
        result.metaAttribution.mapping,
        deadline,
      )
      await markMetaLeadSent({
        recordId: result.recordId,
        bookingUid: parsed.lead.bookingUid,
        eventId: delivery.eventId,
      }, deadline)
      metaLead = "sent"
    } else if (result.metaLeadDelivery.reason === "already_sent") {
      metaLead = "already_sent"
    }
    const common = {
      source: parsed.lead.source,
      campaign: parsed.lead.utmCampaign || "none",
    }
    // Cal retries the same booking UID. Conversion analytics fire only on the
    // first accepted UID mapping; a replay updates CRM state but never counts twice.
    // Vercel telemetry is optional and provider-specific. Never hold a completed
    // transaction open for it, or silently route analytics to a new destination.
    if (process.env.VERCEL && result.firstMapped) {
      void Promise.allSettled([
        track("booking_attributed", common),
        result.created ? track("lead_created", common) : Promise.resolve(),
        parsed.lead.qualified ? track("qualified_lead_created", common) : Promise.resolve(),
        parsed.lead.qualificationStatus === "NEEDS_CONTEXT"
          ? track("needs_context_lead_created", common)
          : Promise.resolve(),
        parsed.lead.qualificationStatus === "NOT_ICP"
          ? track("not_icp_lead_created", common)
          : Promise.resolve(),
      ])
    }
    return NextResponse.json({
      ok: true,
      created: result.created,
      deduplicated: result.deduplicated,
      qualified: result.qualified,
      qualificationStatus: parsed.lead.qualificationStatus,
      metaLead,
      verification: {
        bookingRef: result.bookingRef,
        canonicalRef: result.canonicalRef,
        mappingCount: 1,
      },
      structuredFields: result.structuredFields,
    }, { status: result.created ? 201 : 200 })
  } catch (error) {
    console.error("Cal booking processing error:", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "booking processing failed" }, { status: 502 })
  }
}
