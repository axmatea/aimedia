import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { after } from "next/server"
import { draftDmReply } from "@/lib/instagram-agent/claude"
import { sendDm } from "@/lib/instagram-agent/instagram"
import { notifyOwner } from "@/lib/instagram-agent/telegram"

// Meta webhook for Instagram Direct messages.
//   GET  — subscription verification (hub.challenge echo)
//   POST — message events: auto-reply via Claude, escalate leads to Telegram
//
// Signature: X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(app_secret, rawBody)

export const maxDuration = 300

function verifyMetaSignature(secret: string, rawBody: string, header: string | null): boolean {
  if (!header?.startsWith("sha256=")) return false
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
  const received = header.slice("sha256=".length)
  try {
    const a = Buffer.from(received, "hex")
    const b = Buffer.from(expected, "hex")
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

type MessagingEvent = {
  sender?: { id?: string }
  recipient?: { id?: string }
  message?: { mid?: string; text?: string; is_echo?: boolean }
}

type WebhookPayload = {
  object?: string
  entry?: { messaging?: MessagingEvent[] }[]
}

async function handleIncomingDm(senderId: string, text: string): Promise<void> {
  const decision = await draftDmReply(text)
  await sendDm(senderId, decision.reply)
  if (decision.escalate) {
    await notifyOwner(
      [
        `🔔 DM escalation (sender ${senderId})`,
        ``,
        `Message: ${text}`,
        ``,
        `Auto-reply sent: ${decision.reply}`,
        decision.reason ? `Reason: ${decision.reason}` : ``,
      ].join("\n")
    )
  }
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get("hub.mode")
  const token = params.get("hub.verify_token")
  const challenge = params.get("hub.challenge")

  if (mode === "subscribe" && token && token === process.env.IG_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: "verification failed" }, { status: 403 })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const secret = process.env.META_APP_SECRET
  if (secret) {
    const ok = verifyMetaSignature(secret, rawBody, req.headers.get("x-hub-signature-256"))
    if (!ok) {
      console.warn("[ig webhook] signature verification failed")
      return NextResponse.json({ error: "invalid signature" }, { status: 401 })
    }
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody) as WebhookPayload
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  if (payload.object !== "instagram") {
    return NextResponse.json({ ok: true, action: "ignored" })
  }

  // Collect actionable DMs, then process after the 200 is sent (Meta expects
  // a fast acknowledgment and retries slow endpoints).
  const incoming: { senderId: string; text: string }[] = []
  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const senderId = event.sender?.id
      const text = event.message?.text
      if (!senderId || !text) continue
      if (event.message?.is_echo) continue
      if (senderId === process.env.IG_USER_ID) continue
      incoming.push({ senderId, text })
    }
  }

  if (incoming.length > 0) {
    after(async () => {
      for (const dm of incoming) {
        try {
          await handleIncomingDm(dm.senderId, dm.text)
        } catch (err) {
          console.error("[ig webhook] DM handling failed:", err instanceof Error ? err.message : String(err))
          await notifyOwner(`⚠️ Failed to auto-reply to DM from ${dm.senderId}: ${err instanceof Error ? err.message : "unknown error"}`)
        }
      }
    })
  }

  return NextResponse.json({ ok: true, processed: incoming.length })
}
