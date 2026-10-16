# AI Media: Railway migration preparation

## Current migration execution: 2026-10-15

This section supersedes older preparation-only account/configuration findings below. Cutover is **not approved by these notes** and has not occurred.

- Current production remains Vercel `dpl_4VcCzgrEuNRh3bSAU85wre4d7UC6`, immutable URL `https://ai-media-global-2lppynzts-ai-media1.vercel.app`. Homepage, animated experience and qualified-pipeline route return 200. The production source has not changed from the recovered deployment.
- Isolated execution checkout: `01_AI_BUSINESS/aimedia/website-railway-release`, branch `codex/railway-runtime-release`, starting at `f9e02b6`. This intentionally excludes the later unrelated design-preview commits. The dirty main checkout is preserved.
- Existing Railway project `aimedia` / service `aimedia-web` / environment `staging` is reused. Temporary URL: `https://aimedia-web-staging.up.railway.app`. No new project or database service is needed.
- Existing account access works through the Railway connector, CLI and signed-in dashboard; the account is already on Hobby. No subscription upgrade has been purchased.
- The owner explicitly approved replacement of Vercel Analytics by a first-party collector and a 1000 MB Railway volume. Collection keeps the existing funnel names, source/campaign attribution and path-only dimensions, uses anonymous session IDs, excludes internal QA by default and retains events for 90 days. Historical Vercel Analytics reports are not deleted or imported into a different metric definition. Unique sessions are not equivalent to Vercel's visitor metric.
- A dedicated `/data` volume is staged. Runtime bootstrap prepares only that mount, then drops root privileges before the application starts. SQLite, API functions, assets, image optimization and measurement run on Railway; no new analytics vendor is introduced.
- Available existing runtime credentials were transferred through private stdin with deployment suppressed. No unused Google OAuth, Hunter, Redis/KV, Vercel token or outbound credentials were copied.
- Read-only provider verification using the Railway-configured credentials confirms NAYL Systems, all 37 required Notion schema fields, the verified `aimedia.global` Resend domain, one domain-based Resend webhook, no Vercel-specific Resend webhook URL, and the existing dedicated booking-lock Worker's healthy process. These are not write/booking validations.
- Three existing signing/digest credentials remain unavailable: `CAL_WEBHOOK_SECRET`, `BOOKING_LOCK_HMAC_SECRET`, `BOOKING_LOCK_HASH_SECRET`. They are non-exportable Vercel Secrets and were not found in the checked approved local configuration or exact Keychain records. The stable digest key must not be regenerated as a migration shortcut. The owner must restore the originals securely from their secret source, or approve a separately scoped recovery/rotation plan.
- `CANCEL_FOLLOWUPS_SECRET` is absent from the current Vercel inventory too. The migration makes cancellation and Resend ingestion fail closed if their guards are absent, preventing partial configuration from enabling unauthenticated mutations. Establishing a cancellation secret and matching callers remains a cutover gate.
- Meta CAPI variables are also absent from the current production project's variable inventory. They have not been invented or activated. The recovered strict preflight therefore continues to flag them; do not describe CAPI as verified or healthy.
- The sidebar browser is now able to observe the existing staging `/animated`. Read-only HTTP smoke checks passed for 15 routes/assets, headers, health and MP4 byte ranges. The replacement collector and updated runtime still require a new staging deployment and interaction/console checks before cutover.
- First-party collector revision: the complete production build (including TypeScript), ESLint, 58 conversion tests and 49 deployment tests pass locally. No real emails, bookings, CRM writes or DNS changes were made. Three API configuration guards fail closed before external provider calls.
- The owner confirmed Railway as the final hosting destination and separately requested a visual revision. That visual work is isolated on `codex/railway-visual-refinement`; it does not authorize bypassing the remaining secret, DNS, or integration gates.
- Portable-runtime commit `fc69933508cc57d4ff66f330b91c7940c79c0c73` is pushed and staged on Railway. The deployment approval was not granted, so the existing deployment remains live and the volume is still pending. Do not report the new collector as deployed.

### Visual refinement, local review only

- Quiet CSS-only booking actions and theme control replace per-button shaders on the homepage. The commercial action remains primary; Animated Experience is a secondary text/arrow link. Booking source labels and the 30-minute booking contract are unchanged.
- The robot now shares responsive geometry between themes; only backdrop/fades differ. Removed the full-page scanline layer, added one concise capability sentence, and corrected three audit-observed low-contrast service captions without redesigning their visualizations.
- `/animated` is one sticky scroll timeline: entity/core → orchestration → UNDERSTAND / ROUTE / COORDINATE / ACT → go-to-market, content and client-platform operational states → final actions. Separate remote looping-video sections are no longer rendered; their source/assets remain available. No new generated asset is claimed: Higgsfield authorization is pending in the sidebar browser.
- Local paused MP4s use metadata preloading, a later-loaded bridge and poster fallbacks. One graph changes state rather than restarting as separate sections. The route bypasses global Lenis smoothing to avoid a competing timeline. Reduced motion keeps geometry fixed and crossfades; final controls enter/leave the focus order with scroll direction. Removed the two font families that only the retired stacked scenes used.
- Validation: production build/TypeScript, ESLint, 58 conversion tests and 54 deployment tests pass. Five new tests exercise the actual timeline callbacks, including 2,002 forward/reverse samples, reduced-motion geometry and final focus gates. Local and existing Railway public HTTP smoke suites pass all 15 checks. Local collector HTTP QA confirms recording, replay deduplication, protected summary and QA exclusion without a booking/email/provider write.
- Browser checks confirm the single stage, keyboard end-to-actions, final CTA destinations and opening the 30-minute booking dialog. Responsive Lighthouse renders cover 390×844 and 360×800; a 1440×900 desktop run was also collected. The sidebar viewport override did not consistently apply, so do not claim full interactive mobile/Safari verification. Lighthouse reports under ignored `artifacts/animated-experience/railway-visual-qa/` include load-timeout warnings; scores are preliminary, not a clean comparable production performance baseline. No horizontal overflow was observed at the interactive sidebar viewport, and narrow-mobile stills preserve the entity's head and feet.
- Review production build locally at `http://127.0.0.1:4213/` and `/animated`. No visual release or DNS change has been applied to `aimedia.global`. Existing Vercel production remains the rollback and active primary site.

### Exact domain records prepared, no DNS change applied

Railway attached these custom domains in its own configuration only; public DNS still serves Vercel.

| Type | Name | Required value |
| --- | --- | --- |
| CNAME / flattening ALIAS | `@` | `d8i18p0t.up.railway.app` |
| TXT | `_railway-verify` | `railway-verify=a7d93e97933ab12d97ae8dc3b97c0fe71b6ec64f54b2b7988454da663aa5b30b` |
| CNAME | `www` | `3zzxc639.up.railway.app` |
| TXT | `_railway-verify.www` | `railway-verify=0506edcccda543ed247036d306c7bea7938ba1f34c0e41ce60f31d478147b81d` |

GoDaddy's authoritative nameservers are still `ns13.domaincontrol.com` and `ns14.domaincontrol.com`. Railway documents that GoDaddy does not support the required apex flattening/ALIAS. A DNS provider change, such as free Cloudflare DNS, needs a complete authoritative zone export and separate owner approval before changing nameservers. Do not guess a fixed Railway A record. Preserve Google Workspace MX, SPF, DKIM, DMARC and all other non-web records. Public lookups do not constitute a complete zone backup.

Rollback web records: `@ A 76.76.21.21`; `www CNAME cname.vercel-dns.com`. Keep the Vercel aliases and immutable deployment intact. With DNS moved, restore these web records on the new authoritative provider for the fastest rollback; reverting nameservers is a second, slower fallback. Validate HTTPS and domain-based webhooks again.

### Current cost envelope and retirement boundary

Railway Hobby already has a $5 monthly minimum including $5 usage shared with the account's other projects. Website usage is additional metered consumption, not a second automatic $5 subscription. At current prices, illustrative app usage at 0.25 GB average RAM, 0.025 average vCPU and 10 GB egress is about $3.50/month; at 0.5 GB, 0.05 vCPU and 20 GB egress about $7/month. A fully used 1 GB volume adds about $0.15/month. These are estimates, not measured monthly bills. Videos can raise egress. Pro's $20 minimum has not been selected. Keep the service at one replica; turn off staging sleep for production only as part of the reviewed cutover configuration.

After all gates and separate retirement approval, the AI Media project's Vercel hosting/functions, custom-domain aliases, Git auto-deploy connection and new Web Analytics collection can be disabled. Preserve historical analytics and the rollback deployment during observation. No active Vercel Cron definitions were found. The site's recovered runtime uses no Vercel Blob/Postgres/KV APIs, but do not delete marketplace storage or cancel the shared Vercel team plan without checking other consumers/projects. Notion, Cal.com, Resend, the dedicated Cloudflare Worker/D1 and Google Workspace remain active external dependencies.

The earlier source recovery and offline verification evidence follows.

Audit date: 2026-10-10 UTC. This is a reviewable preparation branch, not a completed migration.
No Railway resources, credentials, domain records, or production aliases were changed.

**SOURCE RECOVERY COMPLETE, CUTOVER STILL GATED:** the current CLI deployment was recovered through the authenticated official Source viewer. Production business logic is restored; intentional hosting/security differences are recorded below. Paid staging still requires the actual Railway plan and budget approval. Credentials, analytics disposition, controlled integration tests and DNS readiness remain separate gates.

## Source of truth

- Repository: https://github.com/axmatea/aimedia
- Preparation base: `757f5ea8190005257d7bc8b2cc46e16ada17d1fc`, branch `codex/conversion-funnel-audit`.
- `main` remains `d5114387bc3b1b3f1aaa7f3026f8b1fee67794df`. Do not deploy `main` by assumption: it lacks subsequent homepage, animated experience, booking-attribution, Cal webhook, and qualified-pipeline work.
- `codex/ai-media-surgical-release` is `a21a391f64a12f425c5528afcebada93be7b557e`. Four later conversion commits are preserved by this preparation base.
- GitHub reports successful Vercel checks for [a21a391f](https://vercel.com/ai-media1/ai-media-global/5dA6kZdZcz2mrNdY1XxRGnjb5r56) and [757f5ea8](https://vercel.com/ai-media1/ai-media-global/5feAu6U5Ak3Nz3EdVC52dEXgAgr1).
- The live homepage's HTML currently reports deployment ID `dpl_4VcCzgrEuNRh3bSAU85wre4d7UC6`. The live `/systems/qualified-pipeline` returns 200. These observations support preserving the newer branch but do **not** prove the exact current production source commit.
- The Vercel connector confirms that deployment is READY, source `cli`, with aliases `aimedia.global` and `www.aimedia.global`. No Git SHA is recorded. Its project contains exactly those two custom domains plus its Vercel-owned domain.
- Its source manifest exposes 138 file hashes at the connector's available depth. Excluding `.env.example`, 117 match the GitHub base byte-for-byte; 8 differ and 12 are absent from the base (including generated `next-env.d.ts`). Deeper API handlers, videos and tests were truncated by the connector. Homepage components are among the 117 exact matches. The deeper paths were subsequently checked through the authorized source viewer and public asset downloads.
- Recovered production-only modules include booking-contract, booking-lock, booking-replay, qualification, cal-scope, Meta attribution allowlisting/CAPI, and conversion preflight/verification. Existing attribution, Cal, Notion, privacy/cookie pages, package manifest/lock, and README differ. Production package metadata shows Next.js 16.3.2. Do not replace these with the older GitHub implementation.
- Source-content responses are truncated at 2,000 base64 characters. The official authenticated browser Source viewer supplied complete content instead: 19 differing/new files were recovered and SHA-1 verified; 15 deeper API/test/landing-page files were recovered through Copy or complete rendered source (independent provider hashes unavailable at that depth). All nine production conversion test files were restored. All 22 deeper public media assets match the live site byte-for-byte. The generated next-env.d.ts and environment example were excluded.
- Railway connection is verified for AI / axmatea. AI's Projects currently contains Compass and CPA projects, with no AI Media service. Runtime variable presence remains unverified. Account-specific plan, invoice and usage findings are kept out of this public repository; confirm them with the owner before provisioning.

The exact visible hash comparison is preserved in [railway-source-parity.json](./railway-source-parity.json); it excludes environment files and does not contain secret values.

Full recovery evidence and limitations are in [railway-source-recovery.json](./railway-source-recovery.json). The original manifest comparison remains intact. Recheck that production has not changed before cutover. Keep immutable rollback URL https://ai-media-global-2lppynzts-ai-media1.vercel.app .

Other visible owned repositories were `compass`, `compass-horizon`, `codex-plugin-cc`, and `graphify`; none is established as a source for this domain. Private repositories may be omitted by the current connection. This branch does not change those projects.

## Portable runtime

- Next.js App Router with server routes, not a static export
- Node 24, locked dependencies, standalone Next.js output
- Multistage Dockerfile; runtime is the non-root `node` user
- `HOSTNAME=0.0.0.0`; Railway's injected `PORT` is honored
- Both `public/` and `.next/static/` are copied explicitly, including the Spline robot, WASM runtime, posters, and desktop/mobile MP4s
- About 29 MB / 63 files of public assets at the audited base; videos account for most of the payload
- Existing Vercel security headers are also defined in `next.config.ts`
- `/api/health` is a non-cached process-health endpoint. It does not check integrations or disclose settings.

The app's persistent lead data lives in Notion and a Google Sheets webhook. Resend holds scheduled emails. The GitHub base has no application database, upload store, local durable queue, or disk-backed lead store. The recovered booking flow additionally requires the existing dedicated AI Media Cloudflare Worker/D1 reservation service. Reuse that exact service and the unchanged BOOKING_LOCK_HASH_SECRET across overlapping Vercel/Railway instances, preserving the same reservation keys and 15-minute lease. No new Railway database or volume is required by this application. The Worker implementation itself was not recovered or independently audited. Next.js's image cache can be ephemeral. Start with one replica; adding replicas would need separate cache/rate-limit review.

## Current Railway configuration approach

Railway detects the root Dockerfile. Create a service only after the target project, budget, and permissions are approved, and connect the reviewed branch/commit rather than defaulting to `main`.

For that service, configure:

- Dockerfile: `Dockerfile`, repository root
- Start command: use the image's default `node server.js`
- Healthcheck path: `/api/health`
- Healthcheck timeout: 120 seconds
- Restart policy: on failure, maximum 3 retries
- One replica in an approved region
- A Railway-generated staging domain first; no custom-domain cutover yet

There is deliberately no new `railway.json`/`railway.toml`: current [Railway documentation](https://docs.railway.com/infrastructure-as-code) says those files cannot be enabled for new services and legacy support ends 2026-12-01. If infrastructure-as-code is desired, first import the actual selected project's configuration without secret values, then review a `.railway/railway.ts` plan. Do not create an assumed project-wide spec that could affect unrelated services.

Sources: [Dockerfiles](https://docs.railway.com/builds/dockerfiles), [healthchecks](https://docs.railway.com/deployments/healthchecks), and Next.js's packaged standalone/self-hosting guides for the installed version.

## Environment inventory: names only

Runtime settings from the recovered production application, with no values retrieved:

| Name | Purpose / migration requirement |
|---|---|
| `RESEND_API_KEY` | Transactional email and scheduled follow-ups; existing authorized key |
| `NOTION_TOKEN` | Lead persistence, status changes, and webhook updates |
| `SHEETS_WEBHOOK_URL` | Existing Sheets mirror endpoint; preserve the complete value securely |
| `MARK_CONTACTED_SECRET` | Existing owner-link signatures; preserve to keep old links valid |
| `CANCEL_FOLLOWUPS_SECRET` | Cancellation endpoint guard; must be configured |
| `RESEND_WEBHOOK_SECRET` | Existing incoming email-event verification secret; must be configured |
| `CAL_WEBHOOK_SECRET` | Existing Cal webhook secret; at least 32 characters |
| `PUBLIC_BASE_URL` | Final canonical origin `https://aimedia.global`; use the approved staging origin during controlled staging tests |
| `FROM_EMAIL` | Existing verified Resend sender |
| `OWNER_EMAIL` | Existing notification recipient |
| `REPLY_TO_EMAIL` | Existing reply-to mailbox |
| `NOTION_LEADS_DB_ID` | Required canonical Cal leads database; no production fallback |
| `CAL_EVENT_TYPE_ID`, `CAL_EVENT_TYPE_SLUG`, `CAL_ORGANIZER_USERNAME` | Exact authorized Cal event scope |
| `BOOKING_LOCK_WORKER_URL` | Existing dedicated HTTPS Worker origin |
| `BOOKING_LOCK_HMAC_SECRET` | Existing Worker request-authentication key, at least 32 characters |
| `BOOKING_LOCK_HASH_SECRET` | Distinct stable digest key; preserve unchanged for shared reservation identity |
| `META_DATASET_ID`, `META_CAPI_ACCESS_TOKEN` | Existing dataset and authorized server-only CAPI access |
| `META_GRAPH_API_VERSION` | Explicitly pinned supported API version |
| `META_ATTRIBUTION_ALLOWLIST_JSON` | Exact campaign/ad-set/ad/creative allowlist |
| `META_CAPI_TEST_EVENT_CODE` | Optional temporary validation setting; must be absent for live cutover |

`PORT` is supplied by Railway and `HOSTNAME` by the Dockerfile. Do not manufacture `VERCEL`, `VERCEL_URL`, or Vercel tokens on Railway.

The historical handoff mentions `LEADS_SHEET_ID` and Google OAuth variables, but current application routes use `SHEETS_WEBHOOK_URL`. Inventory the actual production service before deciding what is required; do not copy unused credentials.

Keep secrets out of Git, Docker build arguments, tickets, screenshots, and chat. Configuring existing credentials for ongoing access in the new provider needs the user's secure authorization/handoff. No secrets were retrieved or copied during preparation.

Run `node scripts/check-runtime-env.mjs` inside the configured runtime. It checks the complete inventory, distinct lock keys, valid scope/origins, Meta mapping shape and absence of a live test-event code without printing values. The recovered `npm run preflight:conversion` is also available locally. A passing result is not proof of provider access, correct D1 lease behavior or the required Notion schema.

## Important functional gates

1. **Analytics:** `FunnelAnalytics` selects development mode outside Vercel. Server-side Vercel events are now explicitly Vercel-only and best-effort; they cannot keep a completed booking transaction open. CRM attribution and browser custom events remain in source, but Vercel analytics collection is not portable as configured. Agree and validate a supported collection destination before claiming full feature parity; do not silently route customer data to a new analytics vendor.
2. **Webhooks:** preserve `/api/webhooks/cal` and `/api/webhooks/resend`, their original signing secrets, and existing domain-based URLs. If either provider uses a Vercel-specific URL, update it only after staging is healthy and with approval.
3. **Email continuity:** preserve sender-domain SPF/DKIM/DMARC, MX, return-path, and verification records. Existing scheduled emails must not be recreated or sent twice. HMAC owner links need the same secret after cutover.
4. **Security configuration:** the existing cancellation and Resend handlers only enforce their guards when the respective secrets are present. Missing secrets are a hard cutover blocker, even if `/api/health` passes. This migration preparation does not alter their business behavior.
5. **Canonical hosts:** sitemap, metadata, and email links use `aimedia.global`. Preserve apex/`www` redirect behavior, path, and query strings. Extra aliases require an explicit domain inventory and desired redirect behavior.

## Bounded booking execution

Vercel's `maxDuration=30` is not a portable process limit. The Railway patch adds one 25-second monotonic application deadline at webhook entry. The same cancellation signal covers bounded streaming request-body reads, D1 reserve/commit, all Notion lookups/writes/readbacks, Meta CAPI and marker verification. Retry delays abort too. Every external call and awaited response checks the remaining shared budget, so a late uncooperative response cannot start another mutation. Timers/listeners are cleaned up per request.

Timeouts remain non-success responses. The code never releases an uncertain reservation on timeout. An already accepted remote write cannot be rolled back by cancellation; existing deterministic Meta event IDs, CRM recovery lookup and D1 lease behavior remain necessary. This is not an exactly-once transactional guarantee.

Offline tests cover all ten provider-call boundaries both with monotonic expiry and late responses that ignore cancellation; streaming overflow, hanging bodies, retry-delay aborts, signal isolation, listener cleanup and no timeout-time unlock are also checked. Existing production behavior limitations remain: page readback is not a global uniqueness query, committed replay is not an exclusive lease, and Vercel-only event counts may be lost after an interrupted first mapping.

## Domain plan, not an applied change

Confirmed names: `aimedia.global` and `www.aimedia.global`. No other customer-owned domains are established as in scope.

Public DNS inspection found `ns13.domaincontrol.com` / `ns14.domaincontrol.com` nameservers and `www` CNAME `cname.vercel-dns.com`. The complete authoritative zone has not been exported.

[Railway's domain guide](https://docs.railway.com/networking/domains/working-with-domains) requires the exact generated CNAME and ownership TXT records. Its apex-domain guidance lists GoDaddy among providers without supported CNAME flattening/dynamic ALIAS. Keeping the bare domain may therefore require an approved DNS-provider change or a separately verified alternative. Do not replace nameservers without a complete zone backup, mail-record preservation, DNSSEC review, and explicit approval.

Hobby currently permits two custom domains per service; apex plus `www` already uses that allowance. Pro permits twenty by default. Do not assume “all domains” fit the cheapest plan or should all serve this app.

## Cost hypothesis

[Railway pricing](https://docs.railway.com/pricing/plans) currently lists Hobby at $5/month and Pro at $20/month, each including an equal amount of usage. Container resources are RAM $10/GB-month, CPU $20/vCPU-month, and outbound transfer $0.05/GB. Builds are free. The relevant bill is the plan minimum or measured usage if greater, before any applicable taxes/add-ons.

Adding this service creates additional metered usage even when an existing plan can host it. Get explicit staging and ongoing spending limits first. Do not apply a workspace-wide hard cutoff that could stop unrelated existing services.

Illustrative low-traffic single-service cases, **not measured estimates**:

- 0.25 GB average RAM + 0.025 average vCPU + 10 GB egress = $3.50 usage, hence $5 Hobby minimum
- 0.5 GB average RAM + 0.05 average vCPU + 20 GB egress = $7 usage

Videos and Spline assets can dominate egress; concurrency/image optimization can raise memory/CPU. Measure staging and actual traffic before promising savings. [Vercel Pro](https://vercel.com/docs/plans/pro-plan) starts at $20/month. If Railway Pro is required, the base price alone is not lower. Keeping Vercel active for rollback also temporarily duplicates costs. Moving hosting does not cancel existing invoices or subscriptions.

## Validation commands

```sh
npm ci
npm run lint
npm run test:conversion
npm run test:deployment
NEXT_TELEMETRY_DISABLED=1 npm run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
HOSTNAME=0.0.0.0 PORT=3000 node .next/standalone/server.js
# In another terminal:
node scripts/deployment-smoke.mjs http://127.0.0.1:3000
```

Where Docker is available:

```sh
docker build -t aimedia-railway:review .
docker run --rm -p 3000:3000 aimedia-railway:review
```

The smoke script only reads public routes. It covers homepage, qualified-pipeline, animated experience, legal/SEO files, script assets, Spline/WASM, security headers, health response, and MP4 range streaming. It does not submit inquiries, send email, write CRM data, or follow signed owner links.

## Verified preparation results

- Base Next.js 16.2.1 build, lint, and all 8 existing conversion tests passed before migration edits.
- Upgraded Next.js and its ESLint config to 16.4.0, the [official 2026-10-07 release](https://github.com/vercel/next.js/releases/tag/v16.4.0). The prior version is covered by official [AVIF/image-optimization RCE](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) and [self-hosted cache-poisoning](https://github.com/advisories/GHSA-4jqv-mc3x-m676) advisories.
- Moved the unused-at-runtime shadcn CLI into development dependencies, refreshed compatible transitive packages, and kept the package lock. It and its `proxy-addr` dependency are absent from the generated standalone tree.
- One reduced-motion counter needed a small lint-compatibility correction: derive the completed number during render instead of synchronously setting state in an effect. No copy, layout, or redesigned buttons were introduced.
- Final Next.js 16.4.0 production build and TypeScript check: passed.
- Final ESLint and `git diff --check`: passed.
- Recovered conversion tests: 49 passed. Added deadline tests: 9 passed. Offline provider-boundary tests: 22 passed. Full environment-readiness tests: 7 passed (87 total).
- Standalone server on an injected port: all 15 public route/asset/range-streaming smoke checks passed, including security-header assertions. Four additional synthetic local Cal HTTP checks passed: signed PING 200, bad signature 401, oversized body 413 and scope mismatch 403. No provider was called. Generated runtime plus public assets is about 106 MB.
- `npm audit --omit=dev`: reduced from 30 findings (2 critical, 18 high) to 6 moderate findings (0 critical, 0 high) on the final 2026-10-10 audit. Remaining findings are the `qs` and Resend/Svix/uuid chains; this is not a claim that all dependencies are vulnerability-free. Development-tool findings remain outside this runtime audit.
- No Docker/Podman engine was available, so the Docker image itself has not been built or launched here. The equivalent standalone output was built and exercised. A real Railway staging/container build is still required.
- Provider credentials, real external mail delivery, CRM writes, live analytics and end-to-end provider authorization were not tested. Source recovery has the explicit evidence/whitespace limitations described above. No real booking or webhook mutation was submitted.
- GitHub connector writes returned 403 `Resource not accessible by integration`. The authenticated GitHub UI was then used to publish `codex/railway-migration-prep`, based on `codex/conversion-funnel-audit`; the default branch was not changed. The draft review originally recorded a production-source blocker; the recovery revision replaces that blocker with the remaining staging/configuration gates. Existing Vercel preview checks may run automatically on that branch.

## Cutover and rollback checklist

1. Verify current live source, complete domain/DNS inventory, owner access, chosen Railway service, region, plan, and spending cap.
2. Verify dependency/security updates, build the exact reviewed commit, and run the container in staging without production DNS changes.
3. Securely configure existing integrations; run the presence check. Agree analytics parity and test it.
4. With an approved test identity and recipients, perform one controlled inquiry/booking test. Verify Notion, Sheets, owner email, prospect email, queued follow-ups, cancellation, and signed webhook handling. Clean up only the authorized test records/messages.
5. Review the exact DNS diff. Preserve every mail/security/verification record. Obtain approval for the final domain/provider change and any paid service commitment.
6. Switch only approved web records. Verify HTTPS and redirects from independent networks plus the read-only smoke suite. Observe booking/webhook errors through a real-traffic window before retiring the old host.
7. If a gate fails, keep traffic on Vercel. If a post-cutover failure occurs, restore the saved prior web records/aliases. Keep Vercel's known-good deployment and integration secrets unchanged while investigating. Recheck HTTPS, website routes, lead capture, and pending follow-up continuity.

Do not cancel Vercel until Railway is validated and the user confirms the cancellation target. The same team has other projects, so cancelling its subscription could affect more than AI Media. Do not delete deployments, rotate signing secrets or change unrelated domains as part of preparation.
