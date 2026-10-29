import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = path => readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8")
const parse = path => JSON.parse(read(path).replace(/^\s*\/\/.*$/gm, ""))

test("staging has its own Worker, no domain routes or business credentials", () => {
  const stage = parse("wrangler.staging.jsonc")
  const prod = parse("wrangler.jsonc")
  assert.notEqual(stage.name, prod.name)
  assert.deepEqual(stage.routes, [])
  assert.equal(stage.vars.ANALYTICS_ENVIRONMENT, "staging")
  assert.equal(prod.vars.ANALYTICS_ENVIRONMENT, "production")
  assert.equal(stage.services[0].service, stage.name)
  assert.deepEqual(Object.keys(stage.vars).sort(), ["ANALYTICS_ENVIRONMENT", "PUBLIC_BASE_URL"])
  assert.equal(stage.d1_databases[0].binding, "ANALYTICS_DB")
  assert.doesNotMatch(read("wrangler.staging.jsonc"), /CAL_WEBHOOK_SECRET|NOTION_TOKEN|RESEND_API_KEY|BOOKING_LOCK_HASH_SECRET/)
  assert.equal(stage.main, prod.main)
  assert.equal(stage.assets.directory, prod.assets.directory)
  assert.equal(stage.keep_names, false)
  assert.match(read("next.config.ts"), /workers/)
  assert.match(read("next.config.ts"), /X-Robots-Tag/)
  assert.match(read("next.config.ts"), /noindex, nofollow/)
})
