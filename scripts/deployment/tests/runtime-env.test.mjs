import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import test from "node:test"

const script = fileURLToPath(new URL("../../check-runtime-env.mjs", import.meta.url))
const secret = "test-only-placeholder-do-not-use-for-authentication"
const valid = {
  RESEND_API_KEY: secret,
  NOTION_TOKEN: secret,
  SHEETS_WEBHOOK_URL: "https://example.invalid/sheets",
  MARK_CONTACTED_SECRET: secret,
  CANCEL_FOLLOWUPS_SECRET: secret,
  RESEND_WEBHOOK_SECRET: secret,
  CAL_WEBHOOK_SECRET: secret,
  NOTION_LEADS_DB_ID: "test-db", CAL_EVENT_TYPE_ID: "5203336", CAL_EVENT_TYPE_SLUG: "call", CAL_ORGANIZER_USERNAME: "axmedia",
  BOOKING_LOCK_WORKER_URL: "https://lock.example.invalid", BOOKING_LOCK_HMAC_SECRET: secret, BOOKING_LOCK_HASH_SECRET: secret + "-distinct",
  META_DATASET_ID: "123456789", META_CAPI_ACCESS_TOKEN: secret, META_GRAPH_API_VERSION: "v99.0",
  META_ATTRIBUTION_ALLOWLIST_JSON: JSON.stringify([{ campaignId: "1234561", adSetId: "1234562", adId: "1234563", creativeLabel: "fixture" }]),
  PUBLIC_BASE_URL: "https://example.invalid",
  FROM_EMAIL: "test@example.invalid",
  OWNER_EMAIL: "test@example.invalid",
  REPLY_TO_EMAIL: "test@example.invalid",
}

function check(env) {
  return spawnSync(process.execPath, [script], { env, encoding: "utf8" })
}

test("missing configuration blocks readiness and lists names only", () => {
  const result = check({})
  assert.equal(result.status, 1)
  assert.match(result.stdout, /MISSING CANCEL_FOLLOWUPS_SECRET/)
  assert.match(result.stdout, /MISSING RESEND_WEBHOOK_SECRET/)
})

test("complete configuration passes without printing values", () => {
  const result = check(valid)
  assert.equal(result.status, 0)
  assert.doesNotMatch(result.stdout + result.stderr, /test-only-placeholder|example\.invalid/)
  assert.match(result.stdout, /Provider access and delivery still require controlled integration tests/)
})

test("short Cal signature secret is rejected", () => {
  const result = check({ ...valid, CAL_WEBHOOK_SECRET: "short" })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /INVALID CAL_WEBHOOK_SECRET/)
})

test("canonical origin must be HTTPS with no path, query, or credentials", () => {
  for (const url of ["http://example.invalid", "https://example.invalid/path", "https://example.invalid/?a=b", "https://user:password@example.invalid"]) {
    const result = check({ ...valid, PUBLIC_BASE_URL: url })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /INVALID PUBLIC_BASE_URL/)
    assert(!result.stderr.includes(url))
  }
})

test("Sheets webhook must use HTTPS without URL credentials", () => {
  const result = check({ ...valid, SHEETS_WEBHOOK_URL: "https://user:password@example.invalid/sheets" })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /INVALID SHEETS_WEBHOOK_URL/)
  assert.doesNotMatch(result.stderr, /password/)
})


test("production booking dependencies cannot be omitted", () => {
  for (const name of ["NOTION_LEADS_DB_ID", "CAL_EVENT_TYPE_ID", "CAL_EVENT_TYPE_SLUG", "CAL_ORGANIZER_USERNAME", "BOOKING_LOCK_WORKER_URL", "BOOKING_LOCK_HMAC_SECRET", "BOOKING_LOCK_HASH_SECRET", "META_DATASET_ID", "META_CAPI_ACCESS_TOKEN", "META_GRAPH_API_VERSION", "META_ATTRIBUTION_ALLOWLIST_JSON"]) {
    const result = check({ ...valid, [name]: "" })
    assert.equal(result.status, 1, name)
    assert(result.stdout.includes(`MISSING ${name}`))
  }
})

test("unsafe lock origins, reused keys, malformed allowlists and test mode block live readiness", () => {
  for (const patch of [
    { BOOKING_LOCK_WORKER_URL: "https://lock.example.invalid/path" },
    { BOOKING_LOCK_HASH_SECRET: secret },
    { META_ATTRIBUTION_ALLOWLIST_JSON: "[{}]" },
    { META_CAPI_TEST_EVENT_CODE: "fixture-test-code" },
  ]) {
    const result = check({ ...valid, ...patch })
    assert.equal(result.status, 1)
    assert.doesNotMatch(result.stdout + result.stderr, /test-only-placeholder|example\.invalid|fixture-test-code/)
  }
})
