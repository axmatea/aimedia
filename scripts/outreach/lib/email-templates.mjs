/**
 * Email templates for the 3-step cold-outreach sequence.
 *
 * Each template returns { subject, html, text } given a context object:
 *   { firstName, company, hook, bucket, footerAddress }
 *
 * The base layout matches the booking-flow drip emails (lib/followups.ts)
 * but uses a lighter, more conversational tone since these are cold.
 */

const CAL_URL = "https://cal.com/axmedia/call"
const SITE_URL = "https://aimedia.global"
const LOGO_URL = "https://aimedia.global/email-logo.png"
const SENDER_NAME = "Naÿl"
const COMPANY_NAME = "AX Media Co"

function safe(s) {
  return String(s ?? "").replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"))
}

function footer(footerAddress) {
  return `
  <tr><td style="padding-top:32px;border-top:1px solid #1a1a26;">
    <p style="color:#666;font-size:12px;margin:0 0 6px;line-height:1.6;">
      <strong style="color:#aaa;">${COMPANY_NAME}</strong> &middot;
      <a href="${SITE_URL}" style="color:#FF2D55;text-decoration:none;">aimedia.global</a>
    </p>
    <p style="color:#444;font-size:11px;margin:0 0 8px;line-height:1.6;">${safe(footerAddress)}</p>
    <p style="color:#555;font-size:11px;margin:0;line-height:1.6;">
      Not for you? Just reply <strong>STOP</strong> and I'll drop your file — no follow-ups, no hard feelings.
    </p>
  </td></tr>`
}

function shell(inner, footerAddress) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#222;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:40px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr><td style="padding:0 0 32px;">
  <a href="${SITE_URL}" style="text-decoration:none;border:0;display:inline-block;">
    <img src="${LOGO_URL}" alt="AX Media Co" width="120" height="120" style="display:block;width:120px;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />
  </a>
</td></tr>
${inner}
${footer(footerAddress)}
</table>
</td></tr></table>
</body></html>`
}

// ─── Stage 1: initial pitch ─────────────────────────────────────────────────
export function stage1({ firstName, company, hook, bucket, footerAddress }) {
  const fn = safe(firstName)
  const co = safe(company)
  const hk = safe(hook)
  const promise = safe(bucket.promiseLine)
  const cs = bucket.caseStudy

  const subject = `Quick one re: ${co}`

  const text = `Hey ${fn},

${hk}

We run AI ops for ${bucket.icpLabel.toLowerCase()} — ${promise}.

Recent: ${cs.project} (${cs.tag}) — ${cs.result}.

If this is on your radar — 25 min on the calendar:
${CAL_URL}

If not, just reply STOP and I'm out of your inbox.

— ${SENDER_NAME}
${COMPANY_NAME} · ${SITE_URL}`

  const html = shell(
    `
  <tr><td style="font-size:16px;line-height:1.7;color:#222;">
    <p style="margin:0 0 16px;">Hey ${fn},</p>
    <p style="margin:0 0 16px;">${hk}</p>
    <p style="margin:0 0 16px;">We run AI ops for ${bucket.icpLabel.toLowerCase()} — ${promise}.</p>
    <p style="margin:0 0 24px;">Recent: <strong>${safe(cs.project)}</strong> (${safe(cs.tag)}) — ${safe(cs.result)}.</p>
    <p style="margin:0 0 12px;">If this is on your radar — 25 min on the calendar:</p>
    <p style="margin:0 0 24px;">
      <a href="${CAL_URL}" style="display:inline-block;background:#FF2D55;color:#fff;text-decoration:none;padding:10px 20px;border-radius:24px;font-weight:600;font-size:14px;">Grab a slot →</a>
    </p>
    <p style="margin:24px 0 0;color:#444;font-size:14px;">— ${SENDER_NAME}</p>
  </td></tr>`,
    footerAddress
  )

  return { subject, html, text }
}

// ─── Stage 2 (+3d): soft bump, pattern break ────────────────────────────────
export function stage2({ firstName, company, footerAddress }) {
  const fn = safe(firstName)
  const co = safe(company)

  const subject = `${fn} — quick nudge`

  const text = `${fn},

Floating this back up in case it got buried. The note about ${co} above.

Worth 25 min, or not the right time?
${CAL_URL}

No pressure either way.

— ${SENDER_NAME}`

  const html = shell(
    `
  <tr><td style="font-size:16px;line-height:1.7;color:#222;">
    <p style="margin:0 0 16px;">${fn},</p>
    <p style="margin:0 0 16px;">Floating this back up in case it got buried. The note about <strong>${co}</strong> above.</p>
    <p style="margin:0 0 24px;">Worth 25 min, or not the right time?</p>
    <p style="margin:0 0 24px;">
      <a href="${CAL_URL}" style="display:inline-block;background:#FF2D55;color:#fff;text-decoration:none;padding:10px 20px;border-radius:24px;font-weight:600;font-size:14px;">Pick a slot →</a>
    </p>
    <p style="margin:0 0 0;color:#666;font-size:14px;">No pressure either way.</p>
    <p style="margin:24px 0 0;color:#444;font-size:14px;">— ${SENDER_NAME}</p>
  </td></tr>`,
    footerAddress
  )

  return { subject, html, text }
}

// ─── Stage 3 (+10d): final, soft exit ───────────────────────────────────────
export function stage3({ firstName, footerAddress }) {
  const fn = safe(firstName)

  const subject = `Closing the file`

  const text = `${fn},

Last note — closing your file on my side so I'm not in your inbox.

If the timing ever shifts and AI ops becomes a thing you want to look at, hit reply and I'll re-open it. Otherwise, best of luck with the build.

— ${SENDER_NAME}
${COMPANY_NAME} · ${SITE_URL}`

  const html = shell(
    `
  <tr><td style="font-size:16px;line-height:1.7;color:#222;">
    <p style="margin:0 0 16px;">${fn},</p>
    <p style="margin:0 0 16px;">Last note — closing your file on my side so I'm not in your inbox.</p>
    <p style="margin:0 0 16px;">If the timing ever shifts and AI ops becomes a thing you want to look at, hit reply and I'll re-open it. Otherwise, best of luck with the build.</p>
    <p style="margin:24px 0 0;color:#444;font-size:14px;">— ${SENDER_NAME}<br/>${COMPANY_NAME} · ${SITE_URL}</p>
  </td></tr>`,
    footerAddress
  )

  return { subject, html, text }
}

export const TEMPLATES = { stage1, stage2, stage3 }
