import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { Resend } from "resend"
import { scheduleFollowUps } from "@/lib/followups"

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY is not configured")
  return new Resend(key)
}

const OWNER_EMAIL = process.env.OWNER_EMAIL || "info@aimedia.global"
const FROM_EMAIL = process.env.FROM_EMAIL || "AX Media <info@aimedia.global>"
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || "info@aimedia.global"
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "https://aimedia.global").replace(/\/$/, "")
const NOTION_DB_ID = "316e953489014e0ebd499995e418d211"

function buildContactedLink(email: string): string | null {
  const secret = process.env.MARK_CONTACTED_SECRET
  if (!secret) return null
  const token = crypto
    .createHmac("sha256", secret)
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 24)
  return `${PUBLIC_BASE_URL}/api/booking/contacted?email=${encodeURIComponent(email)}&token=${token}`
}

type LeadPayload = {
  name: string
  email: string
  phone: string
  projectType?: string
  goal?: string
  budget?: string
}

async function addNotionLead(data: LeadPayload): Promise<string | null> {
  const token = process.env.NOTION_TOKEN
  if (!token) return null

  // Keys must EXACTLY match the budget chip strings in app/page.tsx (BookingSection)
  const budgetMap: Record<string, string> = {
    "$3–10k / mo": "$3–10k / mo",
    "$10–20k / mo": "$10–20k / mo",
    "$20k+ / mo": "$20k+ / mo",
  }
  const budgetOption = data.budget ? (budgetMap[data.budget] ?? null) : null

  const properties: Record<string, unknown> = {
    Name:           { title: [{ text: { content: data.name } }] },
    Email:          { email: data.email },
    Phone:          { phone_number: data.phone },
    "Project Type": { rich_text: [{ text: { content: data.projectType || "" } }] },
    Goal:           { rich_text: [{ text: { content: data.goal || "" } }] },
    Status:         { select: { name: "New" } },
    Source:         { select: { name: "Website" } },
  }
  if (budgetOption) properties.Budget = { select: { name: budgetOption } }

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_DB_ID },
      properties,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Notion API ${res.status}: ${text}`)
  }

  const json = (await res.json()) as { id?: string }
  return json.id || null
}

async function updateNotionLeadFollowUps(
  pageId: string,
  scheduledIds: string[],
  status: "Scheduled" | "Canceled" | "Completed" | "Failed"
) {
  const token = process.env.NOTION_TOKEN
  if (!token) return
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      properties: {
        "Scheduled Emails": {
          rich_text: [{ text: { content: scheduledIds.join(",") } }],
        },
        "Follow-up Status": { select: { name: status } },
      },
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Notion update ${res.status}: ${text.slice(0, 200)}`)
  }
}

async function postToSheetsWebhook(data: LeadPayload) {
  const url = process.env.SHEETS_WEBHOOK_URL
  if (!url) return

  const payload = {
    timestamp: new Date().toISOString(),
    name: data.name,
    email: data.email,
    phone: data.phone,
    projectType: data.projectType || "",
    goal: data.goal || "",
    budget: data.budget || "",
    status: "New",
    source: "Website",
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "follow",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sheets webhook ${res.status}: ${text.slice(0, 200)}`)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, projectType, goal, budget } = body

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const resend = getResend()
    const contactedLink = buildContactedLink(email)

    // ── 1. Dual-write to CRM: Notion + Google Sheet ─────────────────────────
    const leadData = { name, email, phone, projectType, goal, budget }
    const [notionResult, sheetsResult] = await Promise.allSettled([
      addNotionLead(leadData),
      postToSheetsWebhook(leadData),
    ])
    let notionPageId: string | null = null
    if (notionResult.status === "fulfilled") {
      notionPageId = notionResult.value
    } else {
      console.error("Notion CRM error:", notionResult.reason instanceof Error ? notionResult.reason.message : String(notionResult.reason))
    }
    if (sheetsResult.status === "rejected") {
      console.error("Sheets webhook error:", sheetsResult.reason instanceof Error ? sheetsResult.reason.message : String(sheetsResult.reason))
    }

    // ── 2. Notify owner ──────────────────────────────────────────────────────
    const ownerRes = await resend.emails.send({
      from: FROM_EMAIL,
      to: OWNER_EMAIL.trim(),
      replyTo: email,
      subject: `🔥 New Lead: ${name} (${budget})`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#fff;padding:32px;border-radius:12px;">
          <h2 style="color:#FF2D55;margin:0 0 24px;">New Booking Request</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:10px 0;color:#aaa;width:140px;">Name</td><td style="padding:10px 0;font-weight:bold;">${name}</td></tr>
            <tr><td style="padding:10px 0;color:#aaa;">Email</td><td style="padding:10px 0;"><a href="mailto:${email}" style="color:#FF2D55;">${email}</a></td></tr>
            <tr><td style="padding:10px 0;color:#aaa;">Phone</td><td style="padding:10px 0;">${phone}</td></tr>
            <tr><td style="padding:10px 0;color:#aaa;border-top:1px solid #222;">Project Type</td><td style="padding:10px 0;border-top:1px solid #222;">${projectType}</td></tr>
            <tr><td style="padding:10px 0;color:#aaa;">Primary Goal</td><td style="padding:10px 0;">${goal}</td></tr>
            <tr><td style="padding:10px 0;color:#aaa;">Monthly Budget</td><td style="padding:10px 0;color:#FF2D55;font-weight:bold;">${budget}</td></tr>
          </table>
          <div style="margin-top:24px;padding:16px;background:#111;border-radius:8px;border-left:3px solid #FF2D55;">
            <p style="margin:0;color:#aaa;font-size:13px;">Cal.com booking was opened for this lead. 3-step follow-up sequence is scheduled.</p>
          </div>
          ${
            contactedLink
              ? `<div style="margin-top:20px;text-align:center;">
                   <a href="${contactedLink}" style="display:inline-block;background:#C8FF60;color:#050507;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:800;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">✓ Mark as contacted &amp; cancel follow-ups</a>
                   <p style="margin:10px 0 0;color:#444;font-size:11px;">One click: stops the sequence + sets Status=Contacted in Notion.</p>
                 </div>`
              : ""
          }
        </div>
      `,
    })
    if (ownerRes.error) {
      throw new Error(`Resend owner email failed: ${ownerRes.error.message || JSON.stringify(ownerRes.error)}`)
    }

    // ── 3. Follow-up to prospect ─────────────────────────────────────────────
    const firstName = name.split(" ")[0]
    const leadRes = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      replyTo: REPLY_TO_EMAIL,
      subject: `You're in, ${firstName}. Here's what happens next.`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AX Media</title>
</head>
<body style="margin:0;padding:0;background-color:#050507;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#050507;min-height:100vh;">
<tr><td align="center" style="padding:48px 16px 64px;">

  <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

    <!-- ── LOGO ── -->
    <tr>
      <td style="padding-bottom:32px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border-radius:10px;background:#0f0f1a;border:1px solid #1a1a2e;padding:10px 16px;">
              <span style="color:#ffffff;font-size:13px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;">AX MEDIA</span>
              <span style="color:#FF2D55;font-size:13px;font-weight:800;letter-spacing:0.18em;"> ·</span>
              <span style="color:#555;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;"> AI Growth Agency</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── HERO ── -->
    <tr>
      <td style="padding-bottom:40px;">
        <p style="color:#FF2D55;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 14px;">Request confirmed</p>
        <h1 style="color:#ffffff;font-size:32px;font-weight:900;line-height:1.15;letter-spacing:-0.03em;margin:0 0 16px;">You're in, ${firstName}.<br/>We're already on it.</h1>
        <p style="color:#666;font-size:16px;line-height:1.7;margin:0;max-width:460px;">
          Your brief landed with us. Expect a message within <strong style="color:#ccc;">24 hours</strong>. We'll come prepared with a custom AI audit for your business.
        </p>
      </td>
    </tr>

    <!-- ── WHAT HAPPENS NEXT ── -->
    <tr>
      <td style="padding-bottom:32px;">
        <p style="color:#333;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 16px;">What happens next</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">

          <!-- Step 1: done -->
          <tr>
            <td style="padding-bottom:4px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a1a0f;border:1px solid #1a3a22;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="width:32px;vertical-align:top;">
                          <div style="width:24px;height:24px;border-radius:50%;background:#1a4a28;border:1.5px solid #2d8a40;text-align:center;line-height:24px;font-size:11px;color:#4CAF50;font-weight:700;">✓</div>
                        </td>
                        <td style="padding-left:12px;vertical-align:top;">
                          <p style="color:#4CAF50;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 3px;">Done</p>
                          <p style="color:#ccc;font-size:14px;font-weight:600;margin:0;">Brief received &amp; logged</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Step 2 -->
          <tr>
            <td style="padding-bottom:4px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d0d18;border:1px solid #1c1c2e;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="width:32px;vertical-align:top;">
                          <div style="width:24px;height:24px;border-radius:50%;background:#161624;border:1.5px solid #2a2a40;text-align:center;line-height:22px;font-size:11px;color:#555;font-weight:700;">2</div>
                        </td>
                        <td style="padding-left:12px;vertical-align:top;">
                          <p style="color:#FF2D55;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 3px;">Within 24h</p>
                          <p style="color:#ccc;font-size:14px;font-weight:600;margin:0 0 4px;">We prep your AI audit</p>
                          <p style="color:#555;font-size:13px;margin:0;line-height:1.5;">We map your current stack, find the biggest leverage points, and build a growth plan before we even get on a call.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Step 3 -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d0d18;border:1px solid #1c1c2e;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="width:32px;vertical-align:top;">
                          <div style="width:24px;height:24px;border-radius:50%;background:#161624;border:1.5px solid #2a2a40;text-align:center;line-height:22px;font-size:11px;color:#555;font-weight:700;">3</div>
                        </td>
                        <td style="padding-left:12px;vertical-align:top;">
                          <p style="color:#7B2FFF;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 3px;">Strategy call</p>
                          <p style="color:#ccc;font-size:14px;font-weight:600;margin:0 0 4px;">30-minute session, no fluff</p>
                          <p style="color:#555;font-size:13px;margin:0;line-height:1.5;">We walk you through the audit, answer your questions, and show you exactly what we'd build.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>

    <!-- ── BRIEF RECAP ── -->
    <tr>
      <td style="padding-bottom:32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #1c1c2e;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#0d0d18;padding:14px 20px;border-bottom:1px solid #1c1c2e;">
              <span style="color:#444;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Your brief</span>
            </td>
          </tr>
          <tr>
            <td style="background:#090912;padding:0 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #111122;width:100px;color:#333;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;vertical-align:top;padding-top:16px;">Project</td>
                  <td style="padding:14px 0;border-bottom:1px solid #111122;color:#ddd;font-size:14px;font-weight:600;padding-top:16px;">${projectType || "-"}</td>
                </tr>
                <tr>
                  <td style="padding:14px 0;border-bottom:1px solid #111122;color:#333;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;vertical-align:top;">Goal</td>
                  <td style="padding:14px 0;border-bottom:1px solid #111122;color:#ddd;font-size:14px;font-weight:600;">${goal || "-"}</td>
                </tr>
                <tr>
                  <td style="padding:14px 0 16px;color:#333;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;vertical-align:top;">Budget</td>
                  <td style="padding:14px 0 16px;color:#FF2D55;font-size:15px;font-weight:800;">${budget || "-"}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── CTA ── -->
    <tr>
      <td style="padding-bottom:48px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#1a0a1a 0%,#0d0d20 100%);border:1px solid #2a1a3a;border-radius:14px;">
          <tr>
            <td style="padding:28px 32px;">
              <p style="color:#ccc;font-size:15px;font-weight:600;margin:0 0 6px;">Haven't booked your call yet?</p>
              <p style="color:#555;font-size:13px;margin:0 0 20px;line-height:1.5;">Lock in your slot now. Slots fill fast and we only take a limited number of new clients each month.</p>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background:#FF2D55;">
                    <a href="https://cal.com/axmedia/call" style="display:inline-block;color:#ffffff;text-decoration:none;padding:13px 28px;font-weight:700;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Book your free call &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── FOOTER ── -->
    <tr>
      <td style="border-top:1px solid #111118;padding-top:28px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <p style="color:#2a2a3a;font-size:12px;margin:0 0 6px;">
                <strong style="color:#333;">AX Media</strong> &nbsp;&middot;&nbsp;
                <a href="https://aimedia.global" style="color:#FF2D55;text-decoration:none;">aimedia.global</a> &nbsp;&middot;&nbsp;
                <a href="https://instagram.com/ai.mediaco" style="color:#444;text-decoration:none;">@ai.mediaco</a>
              </p>
              <p style="color:#1e1e28;font-size:11px;margin:0;">You received this because you submitted a booking request. No spam, ever.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`,
    })
    if (leadRes.error) {
      throw new Error(`Resend lead email failed: ${leadRes.error.message || JSON.stringify(leadRes.error)}`)
    }

    // ── 4. Schedule 3-step follow-up sequence (+48h / +5d / +10d) ────────────
    const scheduled = await scheduleFollowUps(
      resend,
      { name, email, projectType, goal, budget },
      { from: FROM_EMAIL, replyTo: REPLY_TO_EMAIL }
    )

    // ── 5. Persist scheduled IDs to Notion so we can cancel on reply ────────
    if (notionPageId && scheduled.length > 0) {
      try {
        await updateNotionLeadFollowUps(
          notionPageId,
          scheduled.map((s) => s.id),
          scheduled.length === 3 ? "Scheduled" : "Failed"
        )
      } catch (err) {
        console.error("Notion follow-up update error:", err instanceof Error ? err.message : String(err))
      }
    }

    return NextResponse.json({
      success: true,
      followUps: scheduled.map((s) => ({ key: s.key, scheduledAt: s.scheduledAt })),
    })
  } catch (err) {
    console.error("Booking API error:", err)
    return NextResponse.json({ error: "Failed to process booking" }, { status: 500 })
  }
}
