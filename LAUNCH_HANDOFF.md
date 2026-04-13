# AI Media — Launch Handoff (Jeremy)

**Goal:** ship `aimedia.global` to production tonight.
**Repo:** `/Users/axmatea/Desktop/AI Integration/Projects/AI Media/`
**Vercel project:** `aimedia-global` (already linked, see `.vercel/project.json`)
**Branch:** `main` → auto-deploys on push.

---

## State right now

- Last commit: `cd1103d Clean up: remove debug field from booking response`
- The booking flow was upgraded but **never committed**:
  - 1 modified: `app/api/booking/route.ts` (now imports `@/lib/followups`, builds HMAC mark-contacted links, schedules drip emails, writes scheduled IDs back to Notion)
  - Untracked dependencies the booking route needs to compile:
    - `lib/followups.ts`
    - `lib/cancelFollowUps.ts`
    - `lib/notionLeads.ts`
    - `app/api/booking/cancel-followups/`
    - `app/api/booking/contacted/`
    - `app/api/webhooks/resend/`
    - `docs/`
- **If you push only the modified file the build dies.** Stage everything together.

---

## Tasks (in order)

### 1. Sanity check the working tree
```bash
cd "/Users/axmatea/Desktop/AI Integration/Projects/AI Media"
git status
git diff app/api/booking/route.ts
```
Read each new lib/route file before staging. Make sure imports match (`@/lib/followups`, `@/lib/cancelFollowUps`, `@/lib/notionLeads`).

### 2. Local production build — must pass clean
```bash
rm -rf .next
npm install
npm run build
```
Fix any TS / ESLint errors before going further. Do **not** push a build that fails locally.

### 3. Smoke test the booking flow locally
```bash
npm run start
```
- Open http://localhost:3000
- Submit the booking form with a real email you control
- Verify in this order:
  1. Lead lands in Notion (DB id `316e953489014e0ebd499995e418d211`)
  2. Lead lands in Google Sheets (`LEADS_SHEET_ID`)
  3. You receive the user-facing follow-up email
  4. `OWNER_EMAIL` receives the owner notification
  5. Notion page now has `Scheduled Emails` filled and `Follow-up Status = Scheduled`

If any of these fail — stop. Don't deploy a broken funnel.

### 4. Add the new env vars to Vercel
Already set in production (don't touch): `FROM_EMAIL`, `OWNER_EMAIL`, `RESEND_API_KEY`, `NOTION_TOKEN`, `LEADS_SHEET_ID`, `GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN`, `SHEETS_WEBHOOK_URL`.

**Missing — add these to Vercel → Settings → Environment Variables (Production):**
| Var | Why | How |
|---|---|---|
| `MARK_CONTACTED_SECRET` | HMAC for the "mark contacted" link in the owner email | `openssl rand -hex 32` |
| `CANCEL_FOLLOWUPS_SECRET` | HMAC for `/api/booking/cancel-followups` | `openssl rand -hex 32` |
| `RESEND_WEBHOOK_SECRET` | Verifies inbound Resend webhooks at `/api/webhooks/resend` | Generate in Resend dashboard → Webhooks → copy signing secret |
| `REPLY_TO_EMAIL` | Reply-to header on outbound mail (default `info@aimedia.global`) | Set explicitly to `info@aimedia.global` |
| `PUBLIC_BASE_URL` | Used to build absolute URLs in emails (default `https://aimedia.global`) | `https://aimedia.global` |

After adding, **redeploy** so the new env reaches the runtime.

### 5. Commit + push
```bash
git add app/api/booking/route.ts \
        app/api/booking/cancel-followups \
        app/api/booking/contacted \
        app/api/webhooks \
        lib/followups.ts \
        lib/cancelFollowUps.ts \
        lib/notionLeads.ts \
        docs

git status   # double-check nothing else sneaks in
git commit -m "Wire follow-up scheduling + mark-contacted + Resend webhook"
git push origin main
```
Do **not** stage `.env*`, `.next/`, `.vercel/`, `node_modules/`, `README 2.md`, `Sabina-Content-Operating-Plan-*`, or `.claude/` — they're either gitignored, drafts, or local notes.

### 6. Watch the Vercel deploy
- Go to Vercel dashboard → `aimedia-global` → latest deployment
- Tail build logs. If build fails, fix locally and re-push (do NOT bypass checks)
- When green, click the preview URL and re-run the smoke test from step 3 against the live URL

### 7. Connect the custom domain
- Vercel → `aimedia-global` → Settings → Domains → add `aimedia.global` and `www.aimedia.global`
- Update DNS at the registrar:
  - `A` record `@` → Vercel IP shown in dashboard
  - `CNAME` `www` → `cname.vercel-dns.com`
- Wait for SSL to provision (usually 1–5 minutes). Verify the lock icon.

### 8. Final live verification
- `https://aimedia.global` loads
- `https://aimedia.global/sitemap.xml` returns valid XML
- `https://aimedia.global/robots.txt` returns valid robots
- `https://aimedia.global/privacy-policy`, `/legal`, `/cookies` all 200
- Submit a real booking → verify Notion + Sheets + emails (steps 3.1–3.5) **on production**
- Click the "mark contacted" link in the owner email — the lead's Notion `Follow-up Status` should flip and pending drip emails should cancel

---

## Hard rules

- Do **not** force-push, do **not** rebase `main`, do **not** rewrite history.
- Do **not** commit `.env.production.local` or any file with secrets.
- Do **not** disable security headers in `vercel.json`.
- If the local `npm run build` fails — stop and report. Don't push hoping Vercel fixes it.
- If smoke test fails on any step — stop and report which step.

## Stop and ping Nail if

- Build fails with an error you can't immediately fix
- Notion API returns an error you don't recognise
- Resend rejects the sender domain (DKIM/SPF issue on `aimedia.global`)
- DNS doesn't propagate within 30 min
- Anything in `app/page.tsx` or `app/layout.tsx` looks like it needs a content/copy decision

## Report back with

- Vercel deployment URL
- Production URL `https://aimedia.global` screenshot or status
- Confirmation that all 5 smoke-test items pass on production
- Any new env vars you generated (paste values into 1Password / send to Nail securely — **never** commit them)

---

## Data layer clarification — READ THIS FIRST

**There is no Supabase, no Postgres, no Prisma.** Do not create a Supabase project, do not add a DB package, do not ask for `SUPABASE_URL`. The persistence stack is already decided:

| Layer | Tool | File |
|---|---|---|
| Primary lead store | Notion DB `316e953489014e0ebd499995e418d211` | `lib/notionLeads.ts` |
| Mirror / ops view | Google Sheets `LEADS_SHEET_ID` | `app/api/booking/route.ts` |
| Transactional email | Resend | `lib/followups.ts`, `lib/cancelFollowUps.ts` |
| Email webhooks | Resend → `/api/webhooks/resend` | `app/api/webhooks/resend/route.ts` |

If a Notion API call fails during booking, the route should still return success to the user and log the error — **do not swallow the 200 response by throwing on a Notion hiccup**. Verify the existing error handling in `app/api/booking/route.ts` before deploy.

---

## Phase 2 — First hour after go-live

Stay on the deploy for 60 minutes after the domain flips. Your job is to catch a silent break before any real lead hits the form.

### 2.1 Resend domain auth
- Resend dashboard → Domains → `aimedia.global` — status must be **Verified** (DKIM + SPF green)
- If not verified: add the DKIM + SPF + Return-Path records from Resend to the DNS registrar and wait. **Do not send from an unverified domain** — Gmail and iCloud will drop everything to spam or reject.
- Send one booking through the real form on `https://aimedia.global` with a personal email you own (not a test inbox). Confirm it lands in:
  1. The primary inbox (not spam)
  2. `OWNER_EMAIL`
  3. Notion `Inbound Leads` DB with `Follow-up Status = Scheduled` and a non-empty `Scheduled Emails`
  4. Google Sheets leads tab with a fresh row

### 2.2 Vercel log tail
- Vercel → `aimedia-global` → Deployments → latest → **Runtime Logs** (keep tab open)
- Watch for: 500s on `/api/booking`, Notion `object_not_found` / `unauthorized`, Resend `422` / `403`, `HMAC verification failed`
- Any 500 = stop and investigate before the next submission

### 2.3 HMAC links round-trip
- In the owner email, click **"Mark contacted"** — the target lead's `Follow-up Status` in Notion must flip and the Resend scheduled sends for that lead must be cancelled
- Click the cancel link in the user-facing email — the user's Notion record must flip to `Cancelled` and drip emails must stop

If either link returns 401/403: the `MARK_CONTACTED_SECRET` or `CANCEL_FOLLOWUPS_SECRET` in Vercel does not match the secret used when the email was sent. The fix is to redeploy (not to rotate the secret) — scheduled emails generated before the env change carry the old signature.

### 2.4 SEO + legal surface check
- `https://aimedia.global/sitemap.xml` → 200 + valid XML
- `https://aimedia.global/robots.txt` → 200
- `https://aimedia.global/privacy-policy`, `/legal`, `/cookies` → 200
- Open `https://aimedia.global` in an incognito window on mobile + desktop — no hydration errors, Spline 3D loads, booking form opens

---

## Phase 3 — Day-2 validation (within 24h of go-live)

Run these the morning after launch. Do not skip.

### 3.1 Email deliverability sanity
- Send a booking to a Gmail, iCloud, and Outlook address. All three must land in **Inbox**, not Spam/Junk.
- If iCloud drops to junk: check Resend dashboard for bounce/complaint events, and verify the `aimedia.global` DKIM record is still green.

### 3.2 Drip schedule verification
- In Resend → Scheduled, confirm the follow-up drip is actually queued for each test lead, at the timestamps `lib/followups.ts` computes.
- If you see nothing in "Scheduled": the `scheduleFollowUps` call silently failed at booking time. Check Vercel logs for the booking request.

### 3.3 Notion field hygiene
- Open a handful of leads in the Notion DB. Every row must have: `Scheduled Emails` (array of IDs), `Follow-up Status` (Scheduled / Cancelled / Contacted), `Submitted At`, `Source = website`.
- If any field is empty on a row where the email was sent → `notionLeads.ts` is writing partial data. Report back, don't guess-fix.

### 3.4 Lighthouse on production
```bash
npx lighthouse https://aimedia.global --only-categories=performance,seo,accessibility --view
```
Target: Performance ≥ 85 mobile, SEO ≥ 95, Accessibility ≥ 90. Anything below is a bug report, not a blocker — leave it in `docs/launch-lighthouse-2026-04-08.md`.

---

## Rollback procedure (if production is broken and you can't fix in 15 min)

1. Vercel → `aimedia-global` → Deployments → find the **last green deployment before tonight's push** (`cd1103d Clean up: remove debug field from booking response`)
2. Click `...` → **Promote to Production**
3. Ping Nail immediately with: which step broke, the Vercel deployment URL that died, the exact error
4. **Do not** `git revert` on `main` without Nail's sign-off — the rollback on Vercel is enough to stop the bleed while you diagnose

If the DNS itself is broken (domain not resolving after 30 min):
- Fall back to the Vercel preview URL (`aimedia-global-*.vercel.app`) — the site still works, just on the wrong hostname
- Nail can decide whether to wait on DNS or roll the record back at the registrar

---

## Hand-back to Nail (when you're done)

Post in Notion on this handoff page (comment, not edit) with this exact block filled in:

```
LAUNCH REPORT — <timestamp UTC>
Production URL: https://aimedia.global  (or: FAILED at step <n>)
Vercel deployment: <url of the successful deploy>
Smoke test (prod): [ ] Notion  [ ] Sheets  [ ] User email  [ ] Owner email  [ ] Mark-contacted link
Drip schedule verified: yes / no
Resend domain verified: yes / no
New env vars added to Vercel: <comma-separated list, no values>
Open issues for Nail: <bullet list, or "none">
Secrets delivery: 1Password vault "<name>" / signal / <other> — do not paste here
```

After posting, stop. Nail picks up from there for content, outreach, and the first outbound batch.
