# Cloudflare migration and recovery

## Scope

Base: approved release `37c12f4`, preserving the homepage and Neural Cortex film.
Migration branch: `codex/aimedia-cloudflare-migration`.
Target account: `a377efd40123f2456972979cb5a8ccc9`; Worker: `aimedia-web`.
Do not deploy the unrelated dirty `website/` checkout or Railway prototypes.

29 October 2026 read-only account/DNS verification established:

- Registrar: Porkbun. Cloudflare transfer screen reports the domain is locked.
- Authoritative DNS: Cloudflare, zone `72e29442e6dbb7d2ffc084ad3d3a6f7e`.
- Apex: DNS-only A `76.76.21.21`; www: DNS-only CNAME `cname.vercel-dns.com`.
- Vercel public responses are HTTP 402 `DEPLOYMENT_DISABLED`.
- Domain registration transfer is separate from hosting recovery. Do not unlock,
  order, pay for or execute a registrar transfer as an implicit hosting step.

## Runtime

Next.js 16.4.2, OpenNext 1.20.14, Wrangler 4.155.0, `nodejs_compat`.
`keep_names=false` prevents Wrangler from injecting undefined helpers into
next-themes' serialized browser script (the documented OpenNext workaround).
No R2, paid Images product, or paid Workers upgrade is enabled implicitly.
Existing optimized images are served directly on Cloudflare; the original Next
image behavior remains available for ordinary Node builds.
Secrets must not be supplied at build time or committed in configuration.

Worker review URL: `https://aimedia-web.axmedia.workers.dev`.
The public hostname release retains this noindex URL and attaches only
`aimedia.global` and `www.aimedia.global`. Runtime secrets are encrypted Worker
bindings, never build inputs. Do not treat the health endpoint as CRM proof.
Wrangler authorization has been verified in the target account with the scoped
`workers_scripts:write` permission; do not start another OAuth flow unnecessarily.

```sh
npm ci
npm run lint
npx tsc --noEmit --incremental false
npm run test:conversion
npm run test:deployment
npm run build:cloudflare
npx wrangler deploy --dry-run --outdir .open-next/dry-run
npx wrangler d1 execute ANALYTICS_DB --local --file lib/analytics/schema.sql
npx wrangler dev --local --port 4214
npm run smoke:cloudflare:local
```

Cloudflare Static Assets returns a complete `200` representation for these MP4
Range requests. The scoped outer Worker routes only `/animated/video/*` through
the Cache API, keys the cached representation by the current asset ETag, and lets
the runtime produce native `206`/`416` responses without buffering films in JS.
Local Miniflare's disk-asset bridge still cannot prove the deployed edge path, so
`--local-workerd` remains a loopback-only allowance. Remote smoke MUST require
HTTP 206, correct Content-Range and exactly 1024 bytes:

```sh
npm run smoke:deployment -- https://THE-VERIFIED-WORKER.axmedia.workers.dev
```

Never use the simulator flag for a remote release. No real mail, booking,
follow-up cancellation or production lead write is part of the smoke suite.
The native byte-range behavior uses the documented
[Workers Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/).
The first range request in a cold location fills one complete public asset into
the cache; later seeks read only the requested bytes. No paid storage is enabled.

## First-party analytics

`ANALYTICS_DB` is a dedicated D1 database, not a second CRM or the booking-lock DB.
Create/verify it after approved Cloudflare authentication, pin its real database
ID in wrangler.jsonc, and apply `lib/analytics/schema.sql` to that database only.
The approved hostname release sets `ANALYTICS_ENVIRONMENT=production`.
Use `utm_source=internal_qa` for founder/browser checks and exclude that source
from a real-traffic baseline. Existing staging rows remain separately classified.
The collector rejects foreign origins, unknown properties and oversized bodies;
respects DNT/GPC; and stores anonymous session/event IDs, allowlisted dimensions,
public paths and timestamps. No full URL, raw query, IP or CRM/prospect reference.
Throttle is isolate-local, not a global anti-abuse guarantee. Retention is 90 days.

The existing first-touch and Cal/Notion attribution contract is unchanged.
Server telemetry uses waitUntil and cannot block a completed lead transaction.
The preview Workers domain is noindex. Production www redirects to the apex.

Example founder counts from the Cloudflare D1 console (not a public endpoint):

```sql
SELECT name, COUNT(*) AS events
FROM analytics_events
WHERE environment = 'production'
GROUP BY name;

SELECT source, campaign, medium, name, COUNT(*) AS events
FROM analytics_events
WHERE environment = 'production'
GROUP BY source, campaign, medium, name;
```

## Secret and integration gates

Use only the existing business integrations. Do not activate a new Meta campaign,
outbound sender, email schedule or unrelated account.
The Vercel export is ignored and mode 0600; it must never become a diagnostic
artifact. Only names/presence may be reported. No build step consumes that export.

Vercel marks these values non-exportable: `CAL_WEBHOOK_SECRET`,
`BOOKING_LOCK_HMAC_SECRET`, `BOOKING_LOCK_HASH_SECRET`, `NOTION_TOKEN`, `FROM_EMAIL`.
The existing local Notion credential was read-only verified as NAYL Systems;
the configured database metadata is readable. The Resend domain is verified.
No live CRM write or email was part of those provider checks.
Find the original signing keys in the approved secret store or obtain explicit
approval for a coordinated rotation. Never invent replacements, weaken signature
checks, or change the stable booking digest while an old writer can be active.
The production configuration also lacks `CANCEL_FOLLOWUPS_SECRET`; remedy that
under an explicit secret-configuration approval before declaring full parity.
Meta conversion settings were absent from the inspected Vercel inventory, so
paid-Meta readiness is NOT claimed as a completed production integration.

### Verified active booking dependency, 29 October 2026

Authenticated Cal UI confirms the public `axmedia/call` event is ID `5203336`.
Both its event-specific Webhooks tab and the account-level Webhooks page contain
no registered subscriber. Native Cal iframe/fallback booking is independent of
`/api/webhooks/cal`; `bookingSuccessfulV2` only emits browser analytics. Its saved
default is now 30 minutes, retaining the other duration choices and all meetings.

Therefore hostname recovery does not activate the previously unfinished
Cal-to-Notion/Meta workflow or silently rotate its missing keys. The legacy D1
database and its one COMMITTED mapping remain unchanged. Missing original hash
material prevents claiming lossless historical identity recovery; no reset,
cleanup, replacement database or guessed test-record deletion is authorized.
Cal-to-CRM automation remains an explicit pre-existing integration gap, not a
completed or live-verified part of this hosting release.

The registered production website's legacy inquiry/email settings are migrated
from the existing export, with the independently verified NAYL Systems Notion
credential and existing AX Media sender defaults. No real inquiry, email,
booking or CRM mutation is used for validation. Signed Resend delivery-noop and
invalid-signature tests may validate ingestion without creating an email/lead.

Preserve Cal scope, canonical Notion DB/schema, exact existing booking-lock Worker
and D1 state, Resend signatures, sender identity, owner links, and Sheets mirror.
Use read-only provider checks and signed PING where possible. A real test booking,
CRM write or email requires an explicitly approved owner-controlled test fixture.

## Cutover and rollback

1. Authorize only the official Wrangler flow in the correct Cloudflare account.
2. Deploy the built release to a temporary Workers URL; no custom domain yet.
3. Verify public routes, media ranges, mobile nav, 30-minute native calendar,
   analytics, registered Resend signature handling and existing CRM access.
   Apply the active-dependency distinction above; do not claim Cal-to-CRM is live.
4. Export the full 15-record DNS zone before mutation. Preserve all MX, SPF, DKIM,
   DMARC and verification records, plus unrelated legacy subdomains.
5. Owner has explicitly approved the scoped apex/www Cloudflare cutover. Replace
   only Vercel apex A and www CNAME with Worker custom domains; preserve all other
   13 DNS records. Show/record this exact diff before applying it. Never change
   nameservers, mail records or registrar as an implicit hosting step.
6. Attach apex/www, verify HTTPS and www-to-apex path/query preservation, then
   repeat remote smoke and integration readbacks. Set analytics to production.
7. Roll back web records to the A/CNAME values above if the new host regresses.
   The old Vercel endpoint currently requires billing recovery, so DNS rollback
   alone does not promise immediate availability. Keep the new Worker version
   history and previous approved source available for application rollback.

Do not cancel Vercel or Railway, delete deployments, or alter other projects.
Workers Free suitability needs remote CPU/runtime validation; a Paid upgrade is
at least $5/month plus excess usage and requires separate approval before activation.
