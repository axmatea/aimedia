import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { findLeadByEmail, markFollowUpStatus } from "@/lib/notionLeads"
import { cancelScheduled } from "@/lib/cancelFollowUps"

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY is not configured")
  return new Resend(key)
}

export async function POST(req: NextRequest) {
  try {
    const { email, secret } = (await req.json()) as { email?: string; secret?: string }

    // Optional shared-secret guard so this can't be hit from random clients.
    const expected = process.env.CANCEL_FOLLOWUPS_SECRET
    if (expected && secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 })
    }

    const lead = await findLeadByEmail(email)
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    if (lead.scheduledEmailIds.length === 0) {
      return NextResponse.json({ ok: true, canceled: 0, note: "No scheduled emails on record" })
    }

    const resend = getResend()
    const results = await cancelScheduled(resend, lead.scheduledEmailIds)
    await markFollowUpStatus(lead.id, "Canceled")

    return NextResponse.json({
      ok: true,
      canceled: results.filter((r) => r.ok).length,
      total: results.length,
      results,
    })
  } catch (err) {
    console.error("Cancel follow-ups error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to cancel" },
      { status: 500 }
    )
  }
}
