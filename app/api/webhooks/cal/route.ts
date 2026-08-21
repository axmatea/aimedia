import { NextRequest, NextResponse } from "next/server"
import { track } from "@vercel/analytics/server"
import {
  MAX_CAL_WEBHOOK_BYTES,
  parseCalBookingLead,
  verifyCalWebhookSignature,
} from "@/lib/conversion/cal-webhook"
import { upsertBookingLead } from "@/lib/conversion/notion-bookings"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const length = Number(request.headers.get("content-length") || 0)
  if (Number.isFinite(length) && length > MAX_CAL_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "request too large" }, { status: 413 })
  }

  const secret = process.env.CAL_WEBHOOK_SECRET?.trim() || ""
  if (secret.length < 32) {
    return NextResponse.json({ error: "webhook unavailable" }, { status: 503 })
  }

  const rawBody = await request.text()
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

  const parsed = parseCalBookingLead(rawBody)
  if (!parsed.ok) {
    const status = parsed.error === "unsupported_trigger" ? 422 : 400
    return NextResponse.json({ error: parsed.error }, { status })
  }

  try {
    const result = await upsertBookingLead(parsed.lead)
    const common = {
      source: parsed.lead.source,
      campaign: parsed.lead.utmCampaign || "none",
    }
    await Promise.allSettled([
      track("lead_created", common),
      parsed.lead.qualified ? track("qualified_lead_created", common) : Promise.resolve(),
      !parsed.lead.qualified ? track("needs_context_lead_created", common) : Promise.resolve(),
    ])
    return NextResponse.json({
      ok: true,
      created: result.created,
      qualified: result.qualified,
      contextStatus: parsed.lead.contextStatus,
      structuredFields: result.structuredFields,
    }, { status: result.created ? 201 : 200 })
  } catch (error) {
    console.error("Cal booking persistence error:", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "lead persistence failed" }, { status: 502 })
  }
}
