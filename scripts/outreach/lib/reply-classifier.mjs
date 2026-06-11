/**
 * Reply classifier — sorts an inbound prospect reply into one intent class
 * with a confidence score. Uses Anthropic when ANTHROPIC_API_KEY is present;
 * otherwise falls back to a deterministic keyword classifier so the system
 * works today without an AI key.
 *
 * Classes:
 *   interested   — wants to talk / learn more / open to a call
 *   question     — asks what we do / how / scope / price
 *   objection    — no time / too expensive / already have a solution / not now
 *   referral     — "talk to X" / forwards to someone else
 *   unsubscribe  — stop / remove / not interested at all
 *   auto_reply   — OOO / vacation / autoresponder
 *   off_topic    — unrelated / spam back
 *
 * Returns { class, confidence (0-1), reason, source }
 */
import { optionalEnv } from "./env.mjs"

const RX = {
  unsubscribe: /\b(unsubscribe|stop|remove me|take me off|opt[- ]?out|do not (contact|email)|leave me alone|not interested)\b/i,
  auto_reply:  /\b(out of office|ooo|on vacation|away from my desk|automatic reply|auto[- ]?reply|currently out|annual leave|parental leave)\b/i,
  referral:    /\b(reach out to|talk to|contact|speak (with|to)|forward(ed|ing)? (this )?to|cc'?ing|the right person|my (assistant|partner|colleague|cfo|coo))\b/i,
  objection:   /\b(no time|too (busy|expensive|much)|can'?t afford|budget|not (right )?now|already (have|use|using|working with)|maybe later|down the road|not a (good )?fit|we'?re (good|set|fine))\b/i,
  question:    /\b(what (do|exactly|kind)|how (do|does|much|long)|can you|tell me more|more (info|details)|pricing|price|cost|how would|what would|examples?)\b|\?/i,
  interested:  /\b(interested|let'?s (talk|chat|connect|do it|schedule)|sounds (good|great|interesting)|book|call|meeting|happy to|keen|love to|set (up|something)|when (are|can|works)|available)\b/i,
}

function keywordClassify(text) {
  const t = (text || "").toLowerCase()
  // priority order: unsubscribe > auto_reply > referral > interested > question > objection > off_topic
  if (RX.unsubscribe.test(t)) return { class: "unsubscribe", confidence: 0.9, reason: "matched opt-out language" }
  if (RX.auto_reply.test(t))  return { class: "auto_reply", confidence: 0.85, reason: "autoresponder pattern" }
  if (RX.referral.test(t))    return { class: "referral", confidence: 0.7, reason: "points to another person" }
  const interested = RX.interested.test(t)
  const question = RX.question.test(t)
  const objection = RX.objection.test(t)
  if (interested && !objection) return { class: "interested", confidence: 0.72, reason: "positive engagement language" }
  if (question)                 return { class: "question", confidence: 0.65, reason: "asking for info/scope/price" }
  if (objection)                return { class: "objection", confidence: 0.66, reason: "time/budget/existing-solution pushback" }
  if (interested)               return { class: "interested", confidence: 0.55, reason: "mixed but leaning positive" }
  return { class: "off_topic", confidence: 0.4, reason: "no clear intent signal" }
}

const SYSTEM = `You classify a single inbound reply to a cold B2B outreach email.
Return STRICT JSON: {"class":"<one>","confidence":<0..1>,"reason":"<short>"}.
Classes: interested, question, objection, referral, unsubscribe, auto_reply, off_topic.
- interested: open to a call / wants to move forward.
- question: asks what we do, how, scope, or price.
- objection: no time, too expensive, already using something, not now.
- referral: points you to another person.
- unsubscribe: wants out / not interested at all.
- auto_reply: OOO / vacation autoresponder.
- off_topic: unrelated.
No prose, JSON only.`

export async function classifyReply({ subject = "", body = "" }) {
  const text = `${subject}\n\n${body}`.trim()
  const key = optionalEnv("ANTHROPIC_API_KEY")
  if (!key) {
    return { ...keywordClassify(text), source: "keyword-fallback" }
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: optionalEnv("ANTHROPIC_MODEL", "claude-haiku-4-5"),
        max_tokens: 150,
        system: SYSTEM,
        messages: [{ role: "user", content: text.slice(0, 4000) }],
      }),
    })
    if (!res.ok) throw new Error(`anthropic ${res.status}`)
    const data = await res.json()
    const raw = data?.content?.[0]?.text?.trim() || ""
    const json = JSON.parse(raw.replace(/^```json?|```$/g, "").trim())
    return { class: json.class, confidence: Number(json.confidence) || 0.6, reason: json.reason || "", source: "anthropic" }
  } catch (e) {
    return { ...keywordClassify(text), source: `fallback (${e.message})` }
  }
}
