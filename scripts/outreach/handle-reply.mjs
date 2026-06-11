/**
 * handle-reply — the reply-conversion engine.
 * Takes one inbound prospect reply, classifies it, drafts the AX Media
 * booking-conversion response, and either prints the draft (default,
 * human-review) or sends it (--send) gated by an auto-send safety rule.
 *
 * Usage:
 *   # draft mode (safe, no send) — paste the reply body via --body or a file
 *   node scripts/outreach/handle-reply.mjs --from=jane@acme.com --name="Jane Doe" --company=Acme \
 *     --subject="Re: quick one" --body="sounds interesting, what does it cost?"
 *
 *   node scripts/outreach/handle-reply.mjs --from=... --file=reply.txt
 *
 *   # send mode — actually emails the reply via Resend (info@aimedia.global)
 *   node scripts/outreach/handle-reply.mjs --from=... --body="..." --send
 *
 * Auto-send safety: only `interested` with confidence >= 0.8 is cleared for
 * autonomous send. Everything else is saved as a draft for human review,
 * because questions/objections are where a wrong AI answer costs the deal.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { loadEnv, optionalEnv, requireEnv } from "./lib/env.mjs"
import { classifyReply } from "./lib/reply-classifier.mjs"
import { buildReply, NO_REPLY_CLASSES } from "./lib/reply-templates.mjs"

loadEnv()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args = Object.fromEntries(process.argv.slice(2).map((a) => (a.startsWith("--") ? (([k, ...v]) => [k, v.join("=") || true])(a.slice(2).split("=")) : [a, true])))

const FROM = args.from || ""
const NAME = args.name || ""
const COMPANY = args.company || ""
const SUBJECT = args.subject || ""
let BODY = args.body || ""
if (args.file) BODY = fs.readFileSync(String(args.file), "utf8")
if (!BODY && !process.stdin.isTTY) BODY = fs.readFileSync(0, "utf8")
const SEND = Boolean(args.send)
const AUTO_THRESHOLD = Number(optionalEnv("REPLY_AUTOSEND_CONFIDENCE", "0.8"))

const fromEmail = "Aurea AI <info@aimedia.global>"
const draftsDir = path.join(__dirname, "..", "..", "data", "outreach", "drafts")

function line(t = "") { console.log(t) }
function bar() { line("─".repeat(64)) }

const cls = await classifyReply({ subject: SUBJECT, body: BODY })
const reply = buildReply(cls.class, { name: NAME, company: COMPANY })

bar()
line(`INBOUND REPLY  ·  ${FROM || "(no from)"}`)
bar()
line(`Subject: ${SUBJECT || "(none)"}`)
line(`Body:    ${BODY.slice(0, 240)}${BODY.length > 240 ? "…" : ""}`)
line("")
line(`CLASS:      ${cls.class}`)
line(`CONFIDENCE: ${cls.confidence}  (${cls.source})`)
line(`REASON:     ${cls.reason}`)
bar()

// silent classes
if (NO_REPLY_CLASSES.has(cls.class)) {
  line(`ACTION: none — ${cls.class} gets no reply. Logged, no send.`)
  process.exit(0)
}

// unsubscribe → honor (graceful close), do not pitch
if (cls.class === "unsubscribe") {
  try {
    const { addUnsubscribe } = await import("./lib/state.mjs")
    if (FROM) addUnsubscribe(FROM)
  } catch {}
  line("ACTION: honored unsubscribe. Optional graceful close drafted below; sending NOT auto-cleared.")
}

if (!reply) { line("No template for this class."); process.exit(0) }

line("")
line(`DRAFTED REPLY  ·  subject: ${reply.subject}`)
bar()
line(reply.text)
bar()

const autoClear = cls.class === "interested" && cls.confidence >= AUTO_THRESHOLD
line(`AUTO-SEND CLEARED: ${autoClear ? "YES" : "NO (human review recommended)"}`)

// always save the draft to disk
fs.mkdirSync(draftsDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, "-")
const slug = (FROM || "unknown").replace(/[^a-z0-9]/gi, "_")
const draftPath = path.join(draftsDir, `${stamp}_${slug}_${cls.class}.txt`)
fs.writeFileSync(draftPath, `TO: ${FROM}\nSUBJECT: ${reply.subject}\nCLASS: ${cls.class} (${cls.confidence})\n\n${reply.text}\n`)
line(`Draft saved: ${draftPath}`)

if (!SEND) {
  line("")
  line("DRAFT MODE — nothing sent. Re-run with --send to email it (auto-send rule still applies).")
  process.exit(0)
}

// send mode
if (!FROM) { line("ERROR: --from required to send."); process.exit(1) }
if (!autoClear) {
  line("")
  line("SEND BLOCKED: this class is not auto-send-cleared. Review the draft above, then")
  line(`force send with: --send --force`)
  if (!args.force) process.exit(0)
}

const apiKey = requireEnv("RESEND_API_KEY")
const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from: fromEmail, to: FROM, reply_to: "info@aimedia.global",
    subject: reply.subject, text: reply.text,
    tags: [{ name: "campaign", value: "reply-conversion" }, { name: "class", value: cls.class }],
  }),
})
if (!res.ok) { line(`Resend error: ${res.status} ${await res.text()}`); process.exit(1) }
const d = await res.json()
line("")
line(`SENT ✓  Resend ID: ${d.id}  →  ${FROM}`)
