# Meta proof attribution: activation runbook

This runbook covers the local contract for:

`Meta click -> /systems/qualified-pipeline -> qualified Cal booking -> canonical Notion CRM record -> Meta Lead CAPI`

It does not authorize a deployment, a production test booking, or a Meta campaign launch.

## What the code now guarantees

- First-touch UTM values, `fbclid`, derived `fbc`, and an existing `_fbp` value are kept for the current browser session.
- A current `fbclid` wins over a stale `_fbc`. The site derives an in-memory `fbc` but does not set or extend Meta cookies.
- General Vercel analytics URLs are stripped of `fbclid`, `fbc`, `fbp`, `_fbc`, `_fbp`, `ax_ref`, email, name, and phone.
- Only allowlisted attribution fields are passed into Cal metadata and parsed from the signed webhook.
- Exact Meta campaign, ad-set, ad, and creative labels survive the booking round trip for creative-level CRM reporting.
- Public URL attribution is untrusted until the exact campaign/ad-set/ad/creative tuple matches the server-only allowlist. Only verified tuples populate trusted creative CRM fields or emit CAPI.
- Qualification is deterministic: `QUALIFIED`, `NEEDS_CONTEXT`, or `NOT_ICP`; incomplete applications are never silently promoted.
- Cal webhook requests fail closed when `CAL_WEBHOOK_SECRET`, `NOTION_TOKEN`, or `NOTION_LEADS_DB_ID` is absent.
- A valid signature is not enough: event type ID, event type slug, and organizer username must all match the server-side Cal scope.
- The canonical CRM lookup is Booking UID first. A replay updates the same record and does not emit a second conversion event.
- Duplicate Booking UID rows, duplicate canonical email rows, UID/email conflicts, and same-email/different-UID conflicts fail closed.
- Every accepted write is read back and must resolve to exactly one canonical record before the webhook returns success.
- A dedicated AI Media Worker and D1 database reserve domain-separated keyed-HMAC Booking UID and canonical-email keys through database `UNIQUE` constraints before the Notion query/write/readback.
- A booked Meta-attributed lead sends one deterministic `Lead` event with `event_id=cal:<booking_uid>`. A stored sent marker suppresses normal replays; retries after delivery ambiguity reuse the same event ID so Meta can deduplicate.
- API responses expose only short SHA-256 verification references, never a prospect email or raw Booking UID.

Notion still has no native unique constraint. Do not deploy the route without the dedicated D1 reservation service, and never reuse Isaac or another client's database or secret. D1 permanently binds each Booking UID/email pair to one opaque canonical reference; deterministic Meta event IDs handle external delivery retries. A reservation stays fail-closed for 15 minutes, safely beyond the 30-second webhook limit. After that threshold, only the exact same keyed UID/email pair can atomically take a new operation token; the recovered operation re-runs the UID/email CRM lookup before any write, and the superseded token cannot commit.

## Required environment configuration

Set these only in the approved deployment environment:

- `CAL_WEBHOOK_SECRET`: at least 32 characters; must match the Cal webhook signing secret.
- `CAL_EVENT_TYPE_ID`, `CAL_EVENT_TYPE_SLUG`, `CAL_ORGANIZER_USERNAME`: exact expected scope from the owner-controlled Cal event (`5203336`, `call`, `axmedia` at implementation time).
- `NOTION_TOKEN`: integration token with read/write access to the canonical leads database.
- `NOTION_LEADS_DB_ID`: canonical database ID. There is no hard-coded fallback.
- `BOOKING_LOCK_WORKER_URL`, `BOOKING_LOCK_HMAC_SECRET`: dedicated AI Media Worker endpoint and unique shared HMAC request-authentication secret for atomic D1 UID/email reservations.
- `BOOKING_LOCK_HASH_SECRET`: separate, stable Vercel-only key used for domain-separated HMAC digests of booking UID and normalized email. Never reuse the request-authentication secret.
- `META_DATASET_ID`: numeric Dataset ID owned by the dedicated AI Media ad account.
- `META_CAPI_ACCESS_TOKEN`: Dataset-scoped token. Never expose it to the browser.
- `META_GRAPH_API_VERSION`: explicitly pinned supported Graph API version such as `vNN.N`; no silent default.
- `META_ATTRIBUTION_ALLOWLIST_JSON`: server-only array of exact `{campaignId, adSetId, adId, creativeLabel}` mappings. Duplicate ads or malformed IDs fail closed.
- `META_CAPI_TEST_EVENT_CODE`: optional and temporary for the owner-controlled Test Events validation only.

Run the presence-only gate without printing values:

```bash
npm run preflight:conversion
```

## Required canonical CRM properties

The route refuses writes until these exact names and Notion types exist:

| Property | Type |
|---|---|
| Name | title |
| Email | email |
| Company | rich_text |
| Website | url |
| Business Type | select |
| Buyer Role | select |
| Problem | rich_text |
| Service Needed | rich_text |
| Budget Band | select |
| Timeline | select |
| Preferred Contact | select |
| Qualification Status | select |
| Qualification Reasons | rich_text |
| Source | select |
| Booking UID | rich_text |
| UTM Source | rich_text |
| UTM Medium | rich_text |
| UTM Campaign | rich_text |
| UTM Term | rich_text |
| UTM Content | rich_text |
| Attribution Ref | rich_text |
| Meta Campaign ID | rich_text |
| Meta Ad Set ID | rich_text |
| Meta Ad ID | rich_text |
| Creative Label | rich_text |
| Meta FBCLID | rich_text |
| Meta FBC | rich_text |
| Meta FBP | rich_text |
| Referrer Host | rich_text |
| Landing Page | url |
| Conversion Action | select |
| Booking Status | select |
| Context Status | select |
| Captured At | date |
| Booked At | date |
| Meta Lead Event ID | rich_text |
| Meta Lead Sent At | date |

The database must accept these select values:

- Business Type: `B2B SaaS`, `Software`, `B2B Services`, `Other`
- Buyer Role: `Founder / CEO`, `COO`, `Head of Growth`, `RevOps`, `Other`
- Budget Band: `Under $5k`, `$5k–$10k`, `$10k–$25k`, `$25k+`
- Timeline: `0–30 days`, `31–90 days`, `90+ days`, `Exploring`
- Preferred Contact: `Email`, `Phone`, `WhatsApp`, `Other`
- Qualification Status / Context Status: `QUALIFIED`, `NEEDS_CONTEXT`, `NOT_ICP`
- Source / conversion / booking values: `Website`, `Book a Call`, `Booked`, `Pending`

## Required Cal application questions

Configure these as required questions on the exact `axmedia/call` event type. Labels can vary only within the parser aliases; the recommended labels and values are:

| Label | Input / exact choices |
|---|---|
| Company | short text |
| Company website | URL |
| Business type | `B2B SaaS`, `Software`, `B2B Services`, `Other` |
| Your role | `Founder / CEO`, `COO`, `Head of Growth`, `RevOps`, `Other` |
| Concrete bottleneck | long text |
| Service needed | short or long text |
| Budget band | `Under $5k`, `$5k–$10k`, `$10k–$25k`, `$25k+` |
| Timeline | `0–30 days`, `31–90 days`, `90+ days`, `Exploring` |
| Preferred contact channel | `Email`, `Phone`, `WhatsApp`, `Other` |

`QUALIFIED` requires a complete application, an eligible B2B business, decision-maker role, budget of at least $5k, and timeline within 90 days. An explicit mismatch is `NOT_ICP`; missing or unrecognized context is `NEEDS_CONTEXT`.

## Required Meta URL parameters

Use this exact template on each ad so the CRM can attribute quality to a creative:

```text
utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&ax_ref={{ad.id}}&meta_campaign_id={{campaign.id}}&meta_adset_id={{adset.id}}&meta_ad_id={{ad.id}}&meta_creative={{ad.name}}
```

## Local verification

```bash
npm run test:conversion
npm run verify:conversion
npm run lint
npm run build
```

`verify:conversion` uses only synthetic `.invalid` fixture data. It performs no network call and checks Meta capture, Cal metadata round trip, Booking UID create planning, replay deduplication, and exactly-one readback logic.

## Owner-controlled end-to-end test event

After the owner supplies the production configuration and approves deployment:

1. Configure the Cal event type `axmedia/call` to send signed `BOOKING_CREATED` and `BOOKING_REQUESTED` events to `/api/webhooks/cal`.
2. Record its exact numeric event type ID, slug, and organizer username in production scope configuration.
3. Confirm Cal preserves the custom metadata keys in the webhook payload.
4. Open a tagged URL in a clean browser session using non-sensitive test values.
5. Book with an owner-controlled test identity.
6. Confirm the webhook returns `mappingCount: 1`, `metaLead: sent`, and opaque `bookingRef` and `canonicalRef` values.
7. Confirm Meta Test Events receives one `Lead` with the exact deterministic event ID.
8. Replay the exact signed webhook body. Expect HTTP 200 with `deduplicated: true`, `metaLead: already_sent`, the same references, one CRM row, and no second logical conversion.
9. Run two concurrent first deliveries and confirm D1 grants exactly one reservation and the CRM still has one mapping.
10. In a non-production test database, simulate a crash after reservation. Confirm recovery is rejected before 15 minutes; after the threshold, confirm exactly one same-pair operation token takes over, the old token cannot commit, and an existing CRM row is updated rather than duplicated.
11. Query the canonical CRM and confirm exactly one row contains the Booking UID and exact allowlisted campaign/ad-set/ad/creative fields.
12. Remove `META_CAPI_TEST_EVENT_CODE` before live activation.
13. Delete or clearly label the owner-controlled test record according to the CRM retention policy.

Do not fabricate a prospect, use a customer identity, inspect unrelated records, or run this against production without owner approval.

## Remaining owner-only Meta configuration

Before activating the proof campaign, the owner must select and authorize the exact Meta Dataset, confirm domain/event configuration, and supply the server-only CAPI credentials. No Dataset ID or token is hard-coded.

The owner must also confirm the final Cal event type, webhook subscriber, signing secret, canonical Notion database, required schema, and privacy/consent posture. Until those checks pass, acquisition activation remains blocked.
