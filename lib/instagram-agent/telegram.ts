// Telegram Bot API helpers — the owner's control panel for the agent:
// reference intake, draft approval, escalation notifications.

function botToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured")
  return token
}

function api(method: string): string {
  return `https://api.telegram.org/bot${botToken()}/${method}`
}

async function tg(
  method: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(api(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as { ok: boolean; result?: unknown; description?: string }
  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description}`)
  }
  return (data.result ?? {}) as Record<string, unknown>
}

export type InlineButton = { text: string; callback_data: string }

export async function tgSendMessage(
  chatId: number | string,
  text: string,
  buttons?: InlineButton[][]
): Promise<void> {
  await tg("sendMessage", {
    chat_id: chatId,
    text,
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
  })
}

export async function tgAnswerCallback(callbackQueryId: string, text?: string): Promise<void> {
  await tg("answerCallbackQuery", { callback_query_id: callbackQueryId, ...(text ? { text } : {}) })
}

// Resolve a Telegram file_id to a downloadable URL.
// NOTE: the URL embeds the bot token — treat it as internal-ish. For
// production publishing, re-host images on your own storage (see docs).
export async function tgGetFileUrl(fileId: string): Promise<string> {
  const file = await tg("getFile", { file_id: fileId })
  const path = file.file_path as string
  return `https://api.telegram.org/file/bot${botToken()}/${path}`
}

export function ownerChatId(): string | null {
  return process.env.TELEGRAM_OWNER_CHAT_ID || null
}

// Fire-and-forget notification to the owner; never throws.
export async function notifyOwner(text: string): Promise<void> {
  const chatId = ownerChatId()
  if (!chatId) {
    console.warn("[ig-agent] TELEGRAM_OWNER_CHAT_ID not set — dropping notification:", text)
    return
  }
  try {
    await tgSendMessage(chatId, text)
  } catch (err) {
    console.error("[ig-agent] notifyOwner failed:", err instanceof Error ? err.message : String(err))
  }
}
