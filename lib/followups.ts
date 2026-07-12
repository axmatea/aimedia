import type { Resend } from "resend"

export type LeadLike = {
  name: string
  email: string
  projectType?: string
  goal?: string
  budget?: string
}

type FollowUp = {
  key: "fu1" | "fu2" | "fu3"
  delayHours: number
  subject: (l: LeadLike) => string
  html: (l: LeadLike) => string
  text: (l: LeadLike) => string
}

const CAL_URL = "https://cal.com/axmedia/call"
const BRAND_FOOTER = `
<tr>
  <td style="border-top:1px solid #111118;padding-top:24px;">
    <p style="color:#2a2a3a;font-size:12px;margin:0 0 6px;">
      <strong style="color:#333;">AX Media</strong> &nbsp;&middot;&nbsp;
      <a href="https://aimedia.global" style="color:#FF2D55;text-decoration:none;">aimedia.global</a> &nbsp;&middot;&nbsp;
      <a href="https://instagram.com/ai.mediaco" style="color:#444;text-decoration:none;">@ai.mediaco</a>
    </p>
    <p style="color:#1e1e28;font-size:11px;margin:0;">Reply STOP and I'll drop your file. No follow-ups, no hard feelings.</p>
  </td>
</tr>`

function shell(inner: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#050507;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#050507;">
<tr><td align="center" style="padding:48px 16px 64px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
${inner}
${BRAND_FOOTER}
</table>
</td></tr></table>
</body></html>`
}

// ── FU1 (+48h): the "we actually looked" email ──────────────────────────────
function fu1Html(l: LeadLike): string {
  const firstName = l.name.split(" ")[0]
  return shell(`
<tr><td style="padding-bottom:32px;">
  <p style="color:#FF2D55;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 14px;">Quick update</p>
  <h1 style="color:#fff;font-size:28px;font-weight:900;line-height:1.2;letter-spacing:-0.02em;margin:0 0 20px;">
    ${firstName}, I looked at your brief.
  </h1>
  <p style="color:#aaa;font-size:16px;line-height:1.7;margin:0 0 16px;">
    Short version: the goal you flagged${l.goal ? ` (<em style="color:#ccc;">${l.goal}</em>)` : ""} is the kind of thing we've solved before, and there are 2-3 leverage points I'd bet on inside the first 30 days.
  </p>
  <p style="color:#aaa;font-size:16px;line-height:1.7;margin:0 0 24px;">
    I don't want to dump a generic audit on you over email. Much faster if we jump on a 20-min call: I'll walk you through where I'd start and you tell me if it matches reality on your end.
  </p>
  <table cellpadding="0" cellspacing="0" border="0">
    <tr><td style="border-radius:8px;background:#FF2D55;">
      <a href="${CAL_URL}" style="display:inline-block;color:#fff;text-decoration:none;padding:14px 28px;font-weight:700;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Grab a slot &rarr;</a>
    </td></tr>
  </table>
  <p style="color:#555;font-size:13px;margin:24px 0 0;">Or just hit reply with a time that works, and I'll make it work.</p>
</td></tr>`)
}

function fu1Text(l: LeadLike): string {
  const firstName = l.name.split(" ")[0]
  return `${firstName}, quick update.

I looked at your brief${l.goal ? ` (goal: ${l.goal})` : ""}. There are 2-3 leverage points I'd bet on inside the first 30 days.

Rather than dumping a generic audit on you over email, let's jump on 20 min. I'll walk you through where I'd start.

Grab a slot: ${CAL_URL}

Or just reply with a time and I'll make it work.

AX Media`
}

// ── FU2 (+5d): single-line pattern break ────────────────────────────────────
function fu2Html(l: LeadLike): string {
  const firstName = l.name.split(" ")[0]
  return shell(`
<tr><td style="padding-bottom:32px;">
  <p style="color:#7B2FFF;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 14px;">Checking in</p>
  <h1 style="color:#fff;font-size:26px;font-weight:900;line-height:1.2;letter-spacing:-0.02em;margin:0 0 20px;">
    ${firstName}, still worth a conversation?
  </h1>
  <p style="color:#aaa;font-size:16px;line-height:1.7;margin:0 0 16px;">
    Totally get it if things went quiet on your end, happens every week. Just want to make sure I'm not missing you.
  </p>
  <p style="color:#aaa;font-size:16px;line-height:1.7;margin:0 0 24px;">
    If this is still on your radar, here's the fastest path. Pick any time that fits:
  </p>
  <table cellpadding="0" cellspacing="0" border="0">
    <tr><td style="border-radius:8px;background:#7B2FFF;">
      <a href="${CAL_URL}" style="display:inline-block;color:#fff;text-decoration:none;padding:14px 28px;font-weight:700;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Book 20 min &rarr;</a>
    </td></tr>
  </table>
  <p style="color:#555;font-size:13px;margin:24px 0 0;">If now isn't the moment, no worries. Just hit reply with "later" and I'll follow up in 30 days instead.</p>
</td></tr>`)
}

function fu2Text(l: LeadLike): string {
  const firstName = l.name.split(" ")[0]
  return `${firstName}, still worth a conversation?

Get it if things went quiet, happens every week. Just making sure I'm not missing you.

If this is still on your radar: ${CAL_URL}

If now isn't the moment, reply with "later" and I'll follow up in 30 days instead.

AX Media`
}

// ── FU3 (+10d): soft breakup ────────────────────────────────────────────────
function fu3Html(l: LeadLike): string {
  const firstName = l.name.split(" ")[0]
  return shell(`
<tr><td style="padding-bottom:32px;">
  <p style="color:#C8FF60;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 14px;">Closing the loop</p>
  <h1 style="color:#fff;font-size:26px;font-weight:900;line-height:1.2;letter-spacing:-0.02em;margin:0 0 20px;">
    Closing your file, ${firstName}.
  </h1>
  <p style="color:#aaa;font-size:16px;line-height:1.7;margin:0 0 16px;">
    I'm going to assume the timing just isn't right and stop the follow-ups here. No hard feelings. Most of our best clients came back 3-6 months after going quiet.
  </p>
  <p style="color:#aaa;font-size:16px;line-height:1.7;margin:0 0 24px;">
    If anything changes (new quarter, new hire, a workflow that's finally annoying enough to fix), my inbox stays open. One-line reply is enough to restart the conversation.
  </p>
  <table cellpadding="0" cellspacing="0" border="0">
    <tr><td style="border-radius:8px;border:1px solid #2a2a3a;background:#0d0d18;">
      <a href="${CAL_URL}" style="display:inline-block;color:#ccc;text-decoration:none;padding:13px 26px;font-weight:700;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Or book when ready &rarr;</a>
    </td></tr>
  </table>
  <p style="color:#555;font-size:13px;margin:24px 0 0;">Either way, good luck with what you're building.</p>
</td></tr>`)
}

function fu3Text(l: LeadLike): string {
  const firstName = l.name.split(" ")[0]
  return `Closing your file, ${firstName}.

Going to assume the timing isn't right and stop the follow-ups here. No hard feelings. Most of our best clients came back 3-6 months after going quiet.

If anything changes, my inbox stays open. One-line reply is enough to restart.

Or book when ready: ${CAL_URL}

Good luck with what you're building.

AX Media`
}

const SEQUENCE: FollowUp[] = [
  { key: "fu1", delayHours: 48,  subject: (l) => `${l.name.split(" ")[0]}, quick win from your AI audit`, html: fu1Html, text: fu1Text },
  { key: "fu2", delayHours: 120, subject: (l) => `${l.name.split(" ")[0]}, still worth a conversation?`,  html: fu2Html, text: fu2Text },
  { key: "fu3", delayHours: 240, subject: (l) => `Closing your file, ${l.name.split(" ")[0]}.`,             html: fu3Html, text: fu3Text },
]

export type ScheduledFollowUp = {
  key: "fu1" | "fu2" | "fu3"
  id: string
  scheduledAt: string
}

/**
 * Schedule the 3-step follow-up sequence in Resend.
 * Returns the list of scheduled email IDs + timestamps so the caller can store them in CRM.
 * Any individual failure is logged but does not abort the remaining sends.
 */
export async function scheduleFollowUps(
  resend: Resend,
  lead: LeadLike,
  opts: { from: string; replyTo: string }
): Promise<ScheduledFollowUp[]> {
  const results: ScheduledFollowUp[] = []
  const now = Date.now()

  for (const step of SEQUENCE) {
    const scheduledAt = new Date(now + step.delayHours * 60 * 60 * 1000).toISOString()
    try {
      const res = await resend.emails.send({
        from: opts.from,
        to: lead.email,
        replyTo: opts.replyTo,
        subject: step.subject(lead),
        html: step.html(lead),
        text: step.text(lead),
        scheduledAt,
      })
      if (res.error) {
        console.error(`[followups] ${step.key} schedule failed:`, res.error)
        continue
      }
      const id = res.data?.id
      if (!id) {
        console.error(`[followups] ${step.key} returned no id`)
        continue
      }
      results.push({ key: step.key, id, scheduledAt })
    } catch (err) {
      console.error(`[followups] ${step.key} threw:`, err instanceof Error ? err.message : String(err))
    }
  }

  return results
}
