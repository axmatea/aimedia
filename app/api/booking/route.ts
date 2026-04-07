import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { google } from "googleapis"

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY is not configured")
  return new Resend(key)
}

const OWNER_EMAIL = process.env.OWNER_EMAIL || "info@aimedia.global"
const FROM_EMAIL = process.env.FROM_EMAIL || "AI Media <noreply@aimedia.global>"

async function appendToSheet(row: string[]) {
  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  const sheetId      = process.env.LEADS_SHEET_ID
  if (!clientId || !clientSecret || !refreshToken || !sheetId) return

  const auth = new google.auth.OAuth2(clientId, clientSecret)
  auth.setCredentials({ refresh_token: refreshToken })
  const sheets = google.sheets({ version: "v4", auth })
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Leads!A:G",
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

    // ── 1. Log to Google Sheets ──────────────────────────────────────────────
    try {
      await appendToSheet([timestamp, name, email, phone, projectType || "", goal || "", budget || ""])
    } catch (err) {
      console.error("Sheets logging error:", err)
    }

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
    const firstName = name.split(" ")[0]
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `We got your request, ${firstName} — here's what's next`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Media</title>
</head>
<body style="margin:0;padding:0;background-color:#07070d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#07070d;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Top gradient bar -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#FF2D55 0%,#7B2FFF 50%,#FF2D55 100%);border-radius:3px 3px 0 0;"></td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#0d0d16;border:1px solid #1c1c2e;border-top:none;border-radius:0 0 16px 16px;">

              <!-- Header -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:32px 40px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <img src="https://aimedia.global/logo-gen/v2-01-transparent.png" alt="AI Media" height="28" style="display:block;height:28px;width:auto;" />
                        </td>
                        <td align="right">
                          <span style="background:#FF2D5520;color:#FF2D55;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:5px 12px;border-radius:20px;border:1px solid #FF2D5540;">Request Received</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:0 40px;"><div style="height:1px;background:#1c1c2e;"></div></td></tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:32px 40px 0;">
                    <h2 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 12px;letter-spacing:-0.02em;">Hey ${firstName}, we're on it.</h2>
                    <p style="color:#888;font-size:15px;line-height:1.75;margin:0 0 28px;">
                      Your request is in. Our team is reviewing your brief and will reach out within <strong style="color:#ffffff;">24 hours</strong> with a custom AI growth audit tailored to your stack.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Project Brief Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 40px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111122;border-radius:12px;border:1px solid #1c1c2e;">
                      <tr>
                        <td style="padding:16px 20px 12px;">
                          <span style="color:#FF2D55;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">Your Project Brief</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 20px;">
                          <div style="height:1px;background:#1c1c2e;"></div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="color:#444;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;width:110px;vertical-align:top;padding-top:2px;">Project</td>
                              <td style="color:#e0e0e0;font-size:14px;font-weight:600;">${projectType}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 20px;">
                          <div style="height:1px;background:#1c1c2e;"></div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="color:#444;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;width:110px;vertical-align:top;padding-top:2px;">Goal</td>
                              <td style="color:#e0e0e0;font-size:14px;font-weight:600;">${goal}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 20px;">
                          <div style="height:1px;background:#1c1c2e;"></div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="color:#444;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;width:110px;vertical-align:top;padding-top:2px;">Budget</td>
                              <td style="color:#FF2D55;font-size:14px;font-weight:700;">${budget}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Callout box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 40px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#13102a;border-radius:10px;border:1px solid #2d1f4e;">
                      <tr>
                        <td style="padding:18px 22px;">
                          <p style="color:#b0b0c8;font-size:14px;line-height:1.7;margin:0;">
                            &#128197;&nbsp; Haven't locked in your slot yet? Book your <strong style="color:#ffffff;">free 30-min strategy call</strong> before it fills up.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 40px 36px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="border-radius:8px;background:#FF2D55;">
                          <a href="https://cal.com/axmedia/call" style="display:inline-block;color:#ffffff;text-decoration:none;padding:14px 32px;font-weight:700;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">Book Your Call &rarr;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 40px;">
                    <div style="height:1px;background:#1c1c2e;"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <p style="color:#333;font-size:12px;margin:0 0 4px;">
                            AI Media &nbsp;&middot;&nbsp; <a href="https://aimedia.global" style="color:#FF2D55;text-decoration:none;">aimedia.global</a>
                          </p>
                          <p style="color:#2a2a3a;font-size:11px;margin:0;">You received this because you submitted a booking request on our site.</p>
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
  </table>
</body>
</html>`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Booking API error:", err)
    return NextResponse.json({ error: "Failed to process booking" }, { status: 500 })
  }
}
