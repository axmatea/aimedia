import { NextRequest, NextResponse } from "next/server"
import { publishImagePost } from "@/lib/instagram-agent/instagram"
import { nextApprovedDraft, updateDraft } from "@/lib/instagram-agent/store"
import { notifyOwner } from "@/lib/instagram-agent/telegram"

// Publishing slot: picks the oldest approved draft with an image and posts it.
// Triggered by Vercel Cron (see vercel.json). Protected by CRON_SECRET —
// Vercel sends it as "Authorization: Bearer <CRON_SECRET>" automatically.

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const draft = await nextApprovedDraft()
  if (!draft) {
    return NextResponse.json({ ok: true, action: "queue-empty" })
  }

  const caption = [
    draft.caption,
    "",
    draft.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "),
  ].join("\n")

  try {
    const mediaId = await publishImagePost(draft.imageUrl!, caption)
    draft.status = "published"
    draft.publishedMediaId = mediaId
    await updateDraft(draft)
    await notifyOwner(`🚀 Published ${draft.id} (media ${mediaId})\n\n${draft.idea}`)
    return NextResponse.json({ ok: true, action: "published", draftId: draft.id, mediaId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[ig cron] publish failed:", message)
    draft.status = "failed"
    draft.error = message
    await updateDraft(draft)
    await notifyOwner(`⚠️ Publishing ${draft.id} failed: ${message}`)
    return NextResponse.json({ ok: false, action: "failed", draftId: draft.id, error: message }, { status: 500 })
  }
}
