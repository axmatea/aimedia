# AI Media — Cold Outreach System

Autonomous B2B prospecting pipeline that runs from `info@aimedia.global`.
Discovers candidates, enriches with Hunter.io, generates a personalized AI hook
per prospect, sends stage 1 via Resend, and schedules the Day +3 / Day +10
follow-ups automatically.

Plan reference: `~/.claude/plans/proud-skipping-nygaard.md`

---

## Required env vars

Add these to `.env.production.local` (or `.env`):

```
RESEND_API_KEY=re_…
FROM_EMAIL=AX Media <info@aimedia.global>
REPLY_TO_EMAIL=info@aimedia.global
ANTHROPIC_API_KEY=sk-ant-…
BRAVE_SEARCH_API_KEY=BSA-…
HUNTER_API_KEY=…
FOOTER_ADDRESS=AX Media Co · <LA street address> · USA
```

Optional:

```
ANTHROPIC_HAIKU_MODEL=claude-haiku-4-5
```

---

## One-time setup

1. Sign up at [hunter.io](https://hunter.io) — Starter plan ($49/mo, 1000 lookups).
2. Sign up at [brave.com/search/api](https://brave.com/search/api) — free tier (2000/mo) is fine for MVP.
3. Use the existing Anthropic API key from the project, or create a dedicated one for outreach billing.
4. Provide the LA street address for the CAN-SPAM footer.

---

## How to run

### Dry-run (safe, no sends)

```bash
node scripts/outreach/run-daily.mjs
```

Outputs: discovers prospects, enriches, then prints what stage-1 emails *would*
be sent. Nothing is actually sent. Use this every day until you trust the system.

### Test send to your own email

```bash
node scripts/outreach/personalize-and-send.mjs \
  --test \
  --to=you@gmail.com \
  --company-url=https://stripe.com \
  --first-name=Patrick
```

This pulls the Stripe homepage, generates an AI hook about it, and sends a real
email to your address from `info@aimedia.global`. Best way to QA copy + render.

### Real run (week 1 of warm-up)

```bash
node scripts/outreach/run-daily.mjs --confirm --limit=5
```

Sends 5 prospects through the full pipeline:
discover → enrich → personalize+send → schedule day3+day10 bumps.

Increase `--limit` as you ramp:

| Week | Daily limit |
|------|-------------|
| 1    | 5           |
| 2    | 8           |
| 3-4  | 12          |
| 5+   | 15 (cap)    |

### Cancel follow-ups when a prospect replies

```bash
node scripts/outreach/cancel-on-reply.mjs --email=prospect@example.com --reason=replied
```

Honor an unsubscribe:

```bash
node scripts/outreach/cancel-on-reply.mjs \
  --email=prospect@example.com \
  --reason=unsubscribed \
  --unsubscribe
```

Stop the whole bucket (e.g. campaign pause):

```bash
node scripts/outreach/cancel-on-reply.mjs --bucket=saas --all --reason=paused
```

---

## File map

```
scripts/outreach/
├── README.md                  ← this file
├── run-daily.mjs              ← orchestrator (the one you run daily)
├── discover-prospects.mjs     ← Brave Search + Claude filter → discovered
├── enrich-contacts.mjs        ← Hunter.io → enriched (real email)
├── personalize-and-send.mjs   ← Hook + stage-1 send → sent
├── schedule-followups.mjs     ← Day +3 / Day +10 scheduled
├── cancel-on-reply.mjs        ← cancel + honor STOP
└── lib/
    ├── env.mjs                ← shared env loader
    ├── state.mjs              ← JSON state (data/outreach/*.json)
    ├── icp-buckets.mjs        ← ICP definitions + role priority
    ├── email-templates.mjs    ← stage 1 / 2 / 3 templates
    └── hook-writer.mjs        ← Claude reads homepage → 1-line hook

data/outreach/                 ← state (gitignored)
├── prospects.json             ← every prospect + status
├── campaigns.json             ← active sequences (Resend IDs)
├── sent.json                  ← send history (dedup guard)
└── unsubscribes.json          ← honor list
```

---

## Prospect lifecycle

```
discovered → enriched → sent → scheduled → (replied | finished | stopped)
```

| Status | Set by | Meaning |
|--------|--------|---------|
| `discovered` | discover-prospects | Brave + Claude liked the domain; no email yet |
| `enriched` | enrich-contacts | Hunter found a high-confidence contact + email |
| `no-contact-found` | enrich-contacts | Hunter returned zero results |
| `low-confidence` | enrich-contacts | Found contacts but all <80% confidence or role-emails |
| `sent` | personalize-and-send | Stage 1 fired, awaiting follow-up schedule |
| `scheduled` | schedule-followups | Day +3 + Day +10 queued in Resend |
| `replied` | cancel-on-reply | Sequence cancelled, prospect replied |
| `stopped` | cancel-on-reply | Sequence cancelled, other reason |

---

## Deliverability safeguards (built in)

- **30 sec** delay between sends (rate limit)
- Role emails (`info@`, `support@`, `noreply@`, etc.) auto-skipped
- Hunter confidence `< 80%` auto-skipped
- Unsubscribe list honored on every send
- "Reply STOP" CTA in every email footer
- Physical address in footer (CAN-SPAM compliance)
- Scheduled sends fire 10:00–17:00 PT, weekdays only (push past weekends)

Monitor weekly:
- [Resend dashboard](https://resend.com/emails) — opens / clicks / bounces
- [Google Postmaster Tools](https://postmaster.google.com) for `aimedia.global`
