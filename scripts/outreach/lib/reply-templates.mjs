/**
 * Reply-conversion templates. Every response drives toward ONE outcome:
 * a 25-minute AI audit call (cal.com) where the prospect's #1 workflow
 * leak gets found — the same wedge that closed Jarrar CPA
 * (discovery → audit → Phase 1).
 *
 * Voice: AX Media · plain, direct, no hype, no em dashes.
 * Each template returns { subject, text }. HTML wrapping is applied by the
 * sender in the monochrome AX/Media design.
 */
const CAL = "https://cal.com/axmedia/call"
const SIG = "Aurea AI\nAX Media · AI Operations\naimedia.global"

const firstName = (n) => (n || "there").trim().split(/\s+/)[0]

export const REPLY_TEMPLATES = {
  // open to talking → propose the audit framing + book
  interested: ({ name, company }) => ({
    subject: `Re: your reply — quick audit call`,
    text: `${firstName(name)},

Glad this landed. Easiest next step is a 25-minute call where I map where time and money are leaking inside ${company || "your operation"} right now, and which one or two automations would move the needle first. No pitch, just the map.

Grab whatever slot works: ${CAL}

If none of those times fit, send me two windows and I'll make one work.

${SIG}`,
  }),

  // asks what/how/price → answer tight, reframe to the audit
  question: ({ name, company }) => ({
    subject: `Re: what we do (short version)`,
    text: `${firstName(name)},

Short version: we build AI into the workflows a business already runs, so the manual, repetitive parts get drafted automatically and a person just reviews and approves. Quoting, inbox triage, document-to-report, follow-ups. Always human-in-the-loop, nothing sent or filed on its own.

On price, it depends entirely on what is actually slowing ${company || "you"} down, which is exactly what the call is for. 25 minutes, I find the highest-cost manual workflow you have and tell you straight whether it is worth automating.

Book here: ${CAL}

${SIG}`,
  }),

  // time/budget/existing-solution pushback → lower commitment, reframe
  objection: ({ name, company }) => ({
    subject: `Re: timing`,
    text: `${firstName(name)},

Fair. The call is built for exactly that situation. 25 minutes, no commitment, and the only goal is to find the one workflow costing ${company || "you"} the most hours right now. If there is nothing worth automating, I will tell you and you have lost 25 minutes. If there is, you will know precisely what it is worth before spending a dollar.

If now is genuinely not the time, tell me when to circle back and I will.

Otherwise: ${CAL}

${SIG}`,
  }),

  // points to another person → thank + ask for the intro
  referral: ({ name }) => ({
    subject: `Re: the right person`,
    text: `${firstName(name)},

Appreciate it. Happy to take it to whoever owns this. Could you intro us by email, or pass their address and I will reach out directly with the same short audit offer?

${SIG}`,
  }),

  // out / not interested → honor, leave the door open, no push
  unsubscribe: ({ name }) => ({
    subject: `Re: all set`,
    text: `${firstName(name)},

Understood, I will not follow up. If the timing ever changes and AI inside your workflows becomes worth a look, the door is open.

${SIG}`,
  }),
}

// classes that get NO auto-reply (handled silently)
export const NO_REPLY_CLASSES = new Set(["auto_reply", "off_topic"])

export function buildReply(cls, ctx = {}) {
  if (NO_REPLY_CLASSES.has(cls)) return null
  const fn = REPLY_TEMPLATES[cls]
  if (!fn) return null
  return fn(ctx)
}
