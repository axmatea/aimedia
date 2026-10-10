# Isolated design preview: verification

Checked 10 October 2026 on local branch `preview/premium-workflow-ui`, based on migration-preparation commit `faccb1f`.

## Passed

- TypeScript: `tsc --noEmit --incremental false`
- Targeted ESLint for `app/design-preview`
- Full repository ESLint (`npm run lint`, exit 0)
- Production Next.js 16.4 build, including statically rendered `/design-preview`
- Conversion unit tests: 8 passed (allowlisted attribution, booking metadata, analytics redaction, webhook HMAC and lead parsing)
- Deployment configuration unit tests: 5 passed
- Same-process standalone HTTP smoke checks: home, health, JS asset, animated route, system detail, legal/privacy/cookies, robots/sitemap/manifest, logo, existing robot assets and video byte-range streaming
- Preview HTTP 200; `noindex,nofollow`; server-rendered headline and workflow content; `/#booking` links retained; no Spline scene reference in preview HTML; no preview URL in sitemap
- Diff boundary: presentation and design documentation only; no production home, shared layout, booking components, APIs, conversion libraries, dependencies, lockfile or hosting settings changed

## Not yet verified

- Visual screenshots at desktop/mobile widths, actual keyboard completion, 200% zoom, runtime reduced-motion behavior and axe checks
- Measured bundle size and field/lab Core Web Vitals
- Live booking, CRM, email, analytics, signed links or webhook delivery. Read-only smoke tests do not exercise those integrations
- Parity with the currently deployed production source, which contains newer work absent from this checkout

The cloud shell runs isolated network namespaces. A server and HTTP checks succeed inside one shell, but the separate cloud browser cannot reach that localhost server. Headless Chromium was blocked by sandbox socket restrictions; the escalated route failed with a sandbox mount setup error. No screenshot was produced and no visual/a11y pass is claimed. A future authorized preview in a reachable environment is required for those checks.

An early build failed because a shared `node_modules` symlink left Turbopack’s filesystem root. Dependencies were copied locally without installing or upgrading packages, and the subsequent full production build passed. An intermediate terminal polling session was cancelled; final lint/test/smoke commands were rerun to completion and passed as listed above.

## Dependency security baseline

`npm audit --omit=dev` returned six moderate affected packages, zero high, zero critical. This is not a clean audit. The existing chains are:

- `googleapis` → `googleapis-common` → `qs`: https://github.com/advisories/GHSA-x5fp-wj9c-mxmx and https://github.com/advisories/GHSA-4mjr-xmp4-gh2g
- `resend` → `svix` → `uuid`: https://github.com/advisories/GHSA-w5hq-g745-h8pq

The audit marked `fixAvailable:false`; that means npm did not propose an automatic dependency-tree fix, not that no mitigation can exist. Reachability and safe dependency updates belong in a separately tested backend/security pass on the complete production source. No automatic audit fix was run.

## How to review later

Run `npm run dev` in the complete isolated checkout, then open `/design-preview` in a browser that can reach that process. For production-mode testing use the standalone output with `public` and `.next/static` copied into their expected locations. Existing booking links intentionally return to the current homepage’s booking section.

Do not merge, deploy or change DNS from this branch until production source reconciliation and visual/runtime review are complete. `noindex` is not access control; use explicit preview protection before an authorized hosted review.

## Integration check after source recovery

The isolated preview was subsequently integrated into the recovered-production migration branch on 10 October 2026. The full Next.js build, ESLint, 58 conversion/deadline tests, 29 deployment/provider-boundary tests, 15 public smoke checks and the isolated preview HTTP/noindex/booking/sitemap checks all passed. The original home route remains unchanged. Production source recovery evidence is recorded in railway-source-recovery.json; desktop/mobile visual and keyboard QA still require a reachable hosted preview.
