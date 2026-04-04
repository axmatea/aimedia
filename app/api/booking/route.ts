import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { google } from "googleapis"

// Lazy init — avoids build-time crash when RESEND_API_KEY is not set
function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY is not configured")
  return new Resend(key)
}

const OWNER_EMAIL = process.env.OWNER_EMAIL || "info@aimedia.global"
const FROM_EMAIL = process.env.FROM_EMAIL || "AI Media <noreply@aimedia.global>"

// Append a row to the leads sheet. Silently skips if env vars are missing.
async function appendToSheet(row: string[]) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  const sheetId = process.env.LEADS_SHEET_ID
  if (!clientId || !clientSecret || !refreshToken || !sheetId) return

  const auth = new google.auth.OAuth2(clientId, clientSecret)
  auth.setCredentials({ refresh_token: refreshToken })
  const sheets = google.sheets({ version: "v4", auth })
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, projectType, goal, budget } = body

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const timestamp = new Date().toLocaleString("en-GB", { timeZone: "UTC" })
    const resend = getResend()

    // ── 1. Log to Google Sheets (fire & forget) ──────────────────────────────
    appendToSheet([timestamp, name, email, phone, projectType || "", goal || "", budget || ""])
      .catch(err => console.error("Sheets logging error:", err))

    // ── 2. Notify owner ──────────────────────────────────────────────────────
    await resend.emails.send({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject: `🔥 New Lead: ${name} — ${budget}`,
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
            <p style="margin:0;color:#aaa;font-size:13px;">Cal.com booking was opened for this lead.</p>
          </div>
        </div>
      `,
    })

    // ── 3. Follow-up to prospect ─────────────────────────────────────────────
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `We got your request, ${name.split(" ")[0]} 👋`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#fff;padding:40px;border-radius:12px;">
          <h1 style="font-size:28px;font-weight:900;margin:0 0 8px;text-transform:uppercase;">AI MEDIA</h1>
          <p style="color:#FF2D55;font-size:12px;letter-spacing:0.2em;margin:0 0 32px;text-transform:uppercase;">AI Growth Systems</p>

          <h2 style="font-size:22px;margin:0 0 16px;">Hey ${name.split(" ")[0]},</h2>
          <p style="color:#ccc;line-height:1.7;margin:0 0 24px;">
            We've received your request and we're reviewing your details. Here's what you shared:
          </p>

          <div style="background:#111;border-radius:10px;padding:20px;margin:0 0 24px;border:1px solid #222;">
            <p style="margin:0 0 10px;color:#aaa;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;">Your project brief</p>
            <p style="margin:0 0 8px;"><strong>Project:</strong> ${projectType}</p>
            <p style="margin:0 0 8px;"><strong>Primary Goal:</strong> ${goal}</p>
            <p style="margin:0;"><strong>Budget:</strong> ${budget}</p>
          </div>

          <p style="color:#ccc;line-height:1.7;margin:0 0 28px;">
            One of our team members will reach out within <strong style="color:#fff;">24 hours</strong> to confirm your call and come fully prepared with a custom AI audit for your stack.
          </p>

          <p style="color:#ccc;line-height:1.7;margin:0 0 28px;">
            If you haven't booked your 30-minute strategy call yet, you can do it here:
          </p>

          <a href="https://cal.com/axmedia/call"
             style="display:inline-block;background:#FF2D55;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:15px;letter-spacing:0.05em;text-transform:uppercase;">
            Book Your Call →
          </a>

          <p style="color:#555;font-size:12px;margin:40px 0 0;border-top:1px solid #222;padding-top:20px;">
            AI Media · <a href="https://aimedia.global" style="color:#FF2D55;">aimedia.global</a><br>
            You received this because you submitted a booking request on our site.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Booking API error:", err)
    return NextResponse.json({ error: "Failed to process booking" }, { status: 500 })
  }
}
