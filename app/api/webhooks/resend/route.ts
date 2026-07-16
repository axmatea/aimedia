import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { Resend } from "resend"
import {
  findLeadByEmail,
  findLeadByEmailId,
  markBounced,
  markComplained,
  markEngagement,
  type NotionLead,
} from "@/lib/notionLeads"
import { cancelScheduled } from "@/lib/cancelFollowUps"

// Resend uses Svix-style webhooks. Headers:
//   svix-id, svix-timestamp, svix-signature ("v1,<base64>" space-separated)
// Verification: HMAC-SHA256(secret_bytes, `${id}.${ts}.${rawBody}`) base64
// secret_bytes = base64decode(secret.replace("whsec_", ""))
function verifySvixSignature(
  secret: string,
  rawBody: string,
  svixId: string | null,
  svixTs: string | null,
  svixSig: string | null
): boolean {
  if (!svixId || !svixTs || !svixSig) return false
  const cleanedSecret = secret.replace(/^whsec_/, "")
  let secretBytes: Buffer
  try {
    secretBytes = Buffer.from(cleanedSecret, "base64")
  } catch {
    return false
  }
  const signedPayload = `${svixId}.${svixTs}.${rawBody}`
  const expected = crypto.createHmac("sha256", secretBytes).update(signedPayload).digest("base64")
  // svix-signature header is "v1,<sig> v1,<sig2>", any version match passes.
  const sigs = svixSig.split(" ").map((s) => s.split(",")[1]).filter(Boolean)
  for (const sig of sigs) {
    try {
      const a = Buffer.from(sig)
      const b = Buffer.from(expected)
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true
    } catch {
      // ignore malformed candidate
    }
  }
  return false
}

type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.bounced"
  | "email.complained"
  | "email.opened"
  | "email.clicked"
  | "email.failed"
  | (string & {}) // forward-compat for new event types

type ResendEventPayload = {
  type: ResendEventType
  created_at?: string
  data?: {
    email_id?: string
    to?: string[] | string
    from?: string
    subject?: string
    created_at?: string
  }
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY is not configured")
  return new Resend(key)
}

function recipientFromPayload(p: ResendEventPayload): string | null {
  const to = p.data?.to
  if (!to) return null
  if (Array.isArray(to)) return to[0] || null
  return to || null
}

async function locateLead(p: ResendEventPayload): Promise<NotionLead | null> {
  // Prefer matching by email_id (the actual scheduled message), fall back to recipient.
  // This matters because the FROM address is info@aimedia.global, we never want to
  // accidentally match the agency's own inbox.
  const emailId = p.data?.email_id
  if (emailId) {
    try {
      const byId = await findLeadByEmailId(emailId)
      if (byId) return byId
    } catch (err) {
      console.warn("[resend webhook] findLeadByEmailId failed:", err instanceof Error ? err.message : String(err))
    }
  }
  const to = recipientFromPayload(p)
  if (to) {
    try {
      return await findLeadByEmail(to)
    } catch (err) {
      console.warn("[resend webhook] findLeadByEmail failed:", err instanceof Error ? err.message : String(err))
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // Signature verification: required if RESEND_WEBHOOK_SECRET is set.
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (secret) {
    const ok = verifySvixSignature(
      secret,
      rawBody,
      req.headers.get("svix-id"),
      req.headers.get("svix-timestamp"),
      req.headers.get("svix-signature")
    )
    if (!ok) {
      console.warn("[resend webhook] signature verification failed")
      return NextResponse.json({ error: "invalid signature" }, { status: 401 })
    }
  }

  let payload: ResendEventPayload
  try {
    payload = JSON.parse(rawBody) as ResendEventPayload
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const type = payload.type
  const eventTs = payload.created_at || payload.data?.created_at || new Date().toISOString()
  console.log("[resend webhook]", type, "email_id:", payload.data?.email_id, "to:", recipientFromPayload(payload))

  // Engagement-only events: log + return.
  if (type === "email.sent" || type === "email.delivered" || type === "email.delivery_delayed" || type === "email.failed") {
    return NextResponse.json({ ok: true, type, action: "noop" })
  }

  const lead = await locateLead(payload)
  if (!lead) {
    return NextResponse.json({ ok: true, type, action: "no-matching-lead" })
  }

  try {
    if (type === "email.opened") {
      await markEngagement(lead.id, "opened", eventTs)
      return NextResponse.json({ ok: true, type, leadId: lead.id, action: "marked-opened" })
    }
    if (type === "email.clicked") {
      await markEngagement(lead.id, "clicked", eventTs)
      return NextResponse.json({ ok: true, type, leadId: lead.id, action: "marked-clicked" })
    }
    if (type === "email.bounced" || type === "email.complained") {
      // Cancel any remaining scheduled follow-ups so we stop emailing a dead/angry inbox.
      const resend = getResend()
      const cancelResults = lead.scheduledEmailIds.length > 0
        ? await cancelScheduled(resend, lead.scheduledEmailIds)
        : []
      if (type === "email.bounced") await markBounced(lead.id)
      else await markComplained(lead.id)
      return NextResponse.json({
        ok: true,
        type,
        leadId: lead.id,
        canceled: cancelResults.filter((r) => r.ok).length,
        total: cancelResults.length,
        action: type === "email.bounced" ? "marked-bounced" : "marked-complained",
      })
    }
  } catch (err) {
    console.error("[resend webhook] handler error:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: "handler failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, type, action: "ignored" })
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "resend-webhook" })
}
