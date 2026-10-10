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
