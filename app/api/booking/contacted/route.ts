import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { Resend } from "resend"
import { findLeadByEmail, markContacted } from "@/lib/notionLeads"
import { cancelScheduled } from "@/lib/cancelFollowUps"

// One-click magic link for the owner notification email.
//   GET /api/booking/contacted?email=<lead>&token=<hmac>
// Token = first 24 hex chars of HMAC-SHA256(MARK_CONTACTED_SECRET, lowercased email).
// On hit: cancel scheduled follow-ups, set Status=Contacted in Notion.

function expectedToken(secret: string, email: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 24)
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY is not configured")
  return new Resend(key)
}

function htmlPage(title: string, body: string, accent: string = "#FF2D55"): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${title}</title></head>
<body style="margin:0;padding:0;background:#050507;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#fff;">
<div style="max-width:520px;margin:80px auto;padding:48px 32px;background:#0d0d18;border:1px solid #1c1c2e;border-radius:14px;text-align:center;">
<p style="color:${accent};font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 14px;">AI Media · Internal</p>
<h1 style="color:#fff;font-size:24px;font-weight:900;margin:0 0 16px;">${title}</h1>
<div style="color:#aaa;font-size:15px;line-height:1.6;">${body}</div>
</div></body></html>`
}

async function handle(email: string | null, token: string | null) {
  const secret = process.env.MARK_CONTACTED_SECRET
  if (!secret) {
    return new NextResponse(htmlPage("Server misconfigured", "MARK_CONTACTED_SECRET not set."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }
  if (!email || !token) {
    return new NextResponse(htmlPage("Bad link", "Missing email or token."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }
  const expected = expectedToken(secret, email)
  let valid = false
  try {
    valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    valid = false
  }
  if (!valid) {
    return new NextResponse(htmlPage("Invalid token", "This link is not valid for that email."), {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  let lead
  try {
    lead = await findLeadByEmail(email)
  } catch (err) {
    return new NextResponse(
      htmlPage("Notion lookup failed", err instanceof Error ? err.message : String(err)),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }
  if (!lead) {
    return new NextResponse(htmlPage("Lead not found", `No record for <strong>${email}</strong>.`), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  // 1. Cancel scheduled follow-ups.
  let canceled = 0
  let total = 0
  if (lead.scheduledEmailIds.length > 0) {
    try {
      const resend = getResend()
      const results = await cancelScheduled(resend, lead.scheduledEmailIds)
      total = results.length
      canceled = results.filter((r) => r.ok).length
    } catch (err) {
      console.error("[contacted] cancel error:", err instanceof Error ? err.message : String(err))
    }
  }

  // 2. Mark Notion: Status=Contacted, Follow-up Status=Canceled, Contacted At=now.
  try {
    await markContacted(lead.id)
  } catch (err) {
    return new NextResponse(
      htmlPage("Notion update failed", err instanceof Error ? err.message : String(err), "#C8FF60"),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  return new NextResponse(
    htmlPage(
      "Marked as Contacted",
      `<p>Lead <strong>${email}</strong> updated.</p>
       <p style="margin-top:12px;color:#666;font-size:13px;">Canceled ${canceled}/${total} scheduled follow-ups · Status set to <strong style="color:#C8FF60;">Contacted</strong>.</p>`,
      "#C8FF60"
    ),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  return handle(searchParams.get("email"), searchParams.get("token"))
}

export async function POST(req: NextRequest) {
  // Support POST too in case someone wires it from a form.
  let email: string | null = null
  let token: string | null = null
  try {
    const body = (await req.json()) as { email?: string; token?: string }
    email = body.email || null
    token = body.token || null
  } catch {
    // ignore
  }
  return handle(email, token)
}
