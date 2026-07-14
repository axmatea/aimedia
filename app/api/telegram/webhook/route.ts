import { NextRequest, NextResponse } from "next/server"
import { after } from "next/server"
import { analyzeReference, generateDrafts } from "@/lib/instagram-agent/claude"
import {
  getDraft,
  listDrafts,
  listReferences,
  newId,
  saveDraft,
  saveReference,
  updateDraft,
} from "@/lib/instagram-agent/store"
import {
  tgAnswerCallback,
  tgGetFileUrl,
  tgSendMessage,
} from "@/lib/instagram-agent/telegram"
import type { ContentDraft, ReferenceItem } from "@/lib/instagram-agent/types"

// Telegram is the owner's control panel:
//   - send text / photos / links  -> saved to the reference library (analyzed by Claude)
//   - /generate [n] [instruction] -> n post drafts, each with Approve/Reject buttons
//   - /queue                      -> current draft pipeline
//   - Approve                     -> draft joins the publish queue (picked up by cron)

export const maxDuration = 300

type TgUpdate = {
  message?: {
    message_id: number
    chat: { id: number }
    text?: string
    caption?: string
    photo?: { file_id: string; width: number }[]
  }
  callback_query?: {
    id: string
    data?: string
    message?: { chat: { id: number } }
  }
}

function isAuthorizedChat(chatId: number): boolean {
  const owner = process.env.TELEGRAM_OWNER_CHAT_ID
  // Until the owner chat is configured, allow /start so the id can be discovered.
  if (!owner) return true
  return String(chatId) === owner
}

function draftPreview(draft: ContentDraft): string {
  const lines = [
    `📝 Draft ${draft.id} — ${draft.format}`,
    ``,
    `Idea: ${draft.idea}`,
    ``,
    draft.caption,
    ``,
    draft.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "),
  ]
  if (draft.imagePrompt) lines.push(``, `🎨 Visual brief: ${draft.imagePrompt}`)
  lines.push(``, draft.imageUrl ? `🖼 Image: attached` : `⚠️ No image yet — reply to this draft with a photo, or it can't be published.`)
  return lines.join("\n")
}

async function handleCommand(chatId: number, text: string): Promise<void> {
  const [cmd, ...rest] = text.trim().split(/\s+/)

  if (cmd === "/start" || cmd === "/help") {
    await tgSendMessage(
      chatId,
      [
        `Instagram content agent.`,
        ``,
        `Your chat id: ${chatId}`,
        `(set TELEGRAM_OWNER_CHAT_ID to this value if you haven't)`,
        ``,
        `Send me references — text, links, screenshots — and I'll build a style library.`,
        ``,
        `Commands:`,
        `/generate [n] [instruction] — create n drafts (default 1)`,
        `/queue — show the draft pipeline`,
      ].join("\n")
    )
    return
  }

  if (cmd === "/queue") {
    const drafts = await listDrafts(20)
    if (drafts.length === 0) {
      await tgSendMessage(chatId, "Queue is empty. Send references and run /generate.")
      return
    }
    const lines = drafts.map((d) => `• ${d.id} [${d.status}] ${d.idea.slice(0, 60)}`)
    await tgSendMessage(chatId, `Pipeline:\n${lines.join("\n")}`)
    return
  }

  if (cmd === "/generate") {
    const count = Math.min(Math.max(parseInt(rest[0] ?? "1", 10) || 1, 1), 5)
    const instruction = (parseInt(rest[0] ?? "", 10) ? rest.slice(1) : rest).join(" ")
    await tgSendMessage(chatId, `Generating ${count} draft(s)…`)
    const references = await listReferences(15)
    const generated = await generateDrafts(references, count, instruction || undefined)
    for (const g of generated) {
      const draft: ContentDraft = {
        id: newId("draft"),
        createdAt: new Date().toISOString(),
        status: "pending_approval",
        sourceReferenceIds: references.map((r) => r.id),
        ...g,
      }
      await saveDraft(draft)
      await tgSendMessage(chatId, draftPreview(draft), [
        [
          { text: "✅ Approve", callback_data: `approve:${draft.id}` },
          { text: "❌ Reject", callback_data: `reject:${draft.id}` },
        ],
      ])
    }
    return
  }

  await tgSendMessage(chatId, `Unknown command. /help for the list.`)
}

async function handleReference(
  chatId: number,
  text?: string,
  photoFileId?: string
): Promise<void> {
  let imageUrl: string | undefined
  if (photoFileId) imageUrl = await tgGetFileUrl(photoFileId)

  const ref: ReferenceItem = {
    id: newId("ref"),
    createdAt: new Date().toISOString(),
    source: "telegram",
    text,
    imageUrl,
  }
  try {
    ref.analysis = await analyzeReference(text, imageUrl)
  } catch (err) {
    console.error("[tg webhook] reference analysis failed:", err instanceof Error ? err.message : String(err))
  }
  await saveReference(ref)

  const summary = ref.analysis
    ? `Saved ✅\n\nFormat: ${ref.analysis.format}\nHook: ${ref.analysis.hook}\nTone: ${ref.analysis.tone}\nWhy it works: ${ref.analysis.whyItWorks}`
    : `Saved ✅ (analysis failed — stored raw, will still be used)`
  await tgSendMessage(chatId, summary)
}

async function handleCallback(cb: NonNullable<TgUpdate["callback_query"]>): Promise<void> {
  const chatId = cb.message?.chat.id
  const [action, draftId] = (cb.data ?? "").split(":")
  if (!draftId || !chatId) {
    await tgAnswerCallback(cb.id)
    return
  }
  const draft = await getDraft(draftId)
  if (!draft) {
    await tgAnswerCallback(cb.id, "Draft not found")
    return
  }
  if (action === "approve") {
    draft.status = "approved"
    await updateDraft(draft)
    await tgAnswerCallback(cb.id, "Approved")
    await tgSendMessage(
      chatId,
      draft.imageUrl
        ? `✅ ${draft.id} approved — queued for the next publishing slot.`
        : `✅ ${draft.id} approved, but it has no image. Send a photo with the caption "${draft.id}" to attach one.`
    )
  } else if (action === "reject") {
    draft.status = "rejected"
    await updateDraft(draft)
    await tgAnswerCallback(cb.id, "Rejected")
    await tgSendMessage(chatId, `❌ ${draft.id} rejected.`)
  } else {
    await tgAnswerCallback(cb.id)
  }
}

// A photo whose caption is a draft id attaches that photo to the draft.
async function maybeAttachImageToDraft(
  chatId: number,
  caption: string,
  photoFileId: string
): Promise<boolean> {
  const draftId = caption.trim()
  if (!draftId.startsWith("draft_")) return false
  const draft = await getDraft(draftId)
  if (!draft) return false
  draft.imageUrl = await tgGetFileUrl(photoFileId)
  await updateDraft(draft)
  await tgSendMessage(chatId, `🖼 Image attached to ${draft.id}.`)
  return true
}

export async function POST(req: NextRequest) {
  // Optional shared-secret check (set via setWebhook's secret_token).
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let update: TgUpdate
  try {
    update = (await req.json()) as TgUpdate
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  // Answer Telegram fast; do the heavy lifting after the response.
  after(async () => {
    try {
      if (update.callback_query) {
        const chatId = update.callback_query.message?.chat.id
        if (chatId !== undefined && !isAuthorizedChat(chatId)) return
        await handleCallback(update.callback_query)
        return
      }

      const msg = update.message
      if (!msg) return
      if (!isAuthorizedChat(msg.chat.id)) return

      const text = msg.text ?? msg.caption
      const photo = msg.photo?.length ? msg.photo[msg.photo.length - 1] : undefined

      if (photo && text && (await maybeAttachImageToDraft(msg.chat.id, text, photo.file_id))) {
        return
      }
      if (text?.startsWith("/")) {
        await handleCommand(msg.chat.id, text)
        return
      }
      if (text || photo) {
        await handleReference(msg.chat.id, text, photo?.file_id)
      }
    } catch (err) {
      console.error("[tg webhook] handler error:", err instanceof Error ? err.message : String(err))
      const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id
      if (chatId !== undefined) {
        try {
          await tgSendMessage(chatId, `⚠️ Error: ${err instanceof Error ? err.message : "unknown"}`)
        } catch {
          // nothing else to do
        }
      }
    }
  })

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "telegram-webhook" })
}
