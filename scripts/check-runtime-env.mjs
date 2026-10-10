// Run inside the intended runtime, after secure configuration. Values are never
// printed or sent anywhere. This is a cutover gate, not a build requirement.
const required = [
  "RESEND_API_KEY", "NOTION_TOKEN", "SHEETS_WEBHOOK_URL",
  "MARK_CONTACTED_SECRET", "CANCEL_FOLLOWUPS_SECRET", "RESEND_WEBHOOK_SECRET",
  "NOTION_LEADS_DB_ID", "CAL_EVENT_TYPE_ID", "CAL_EVENT_TYPE_SLUG", "CAL_ORGANIZER_USERNAME",
  "BOOKING_LOCK_WORKER_URL", "BOOKING_LOCK_HMAC_SECRET", "BOOKING_LOCK_HASH_SECRET",
  "META_DATASET_ID", "META_CAPI_ACCESS_TOKEN", "META_GRAPH_API_VERSION", "META_ATTRIBUTION_ALLOWLIST_JSON",
  "CAL_WEBHOOK_SECRET", "PUBLIC_BASE_URL", "FROM_EMAIL", "OWNER_EMAIL", "REPLY_TO_EMAIL",
]
let failed = false
for (const name of required) {
  const configured = Boolean(process.env[name]?.trim())
  console.log(`${configured ? "SET" : "MISSING"} ${name}`)
  if (!configured) failed = true
}
if (process.env.CAL_WEBHOOK_SECRET && process.env.CAL_WEBHOOK_SECRET.trim().length < 32) {
  console.error("INVALID CAL_WEBHOOK_SECRET: must be at least 32 characters")
  failed = true
}
for (const name of ["PUBLIC_BASE_URL", "SHEETS_WEBHOOK_URL"]) {
  if (!process.env[name]) continue
  try {
    const url = new URL(process.env[name])
    if (url.protocol !== "https:" || url.username || url.password) throw new Error()
    if (name === "PUBLIC_BASE_URL" && (url.pathname !== "/" || url.search || url.hash)) throw new Error()
  } catch {
    console.error(`INVALID ${name}: expected a secure URL${name === "PUBLIC_BASE_URL" ? " origin" : ""}`)
    failed = true
  }
}
const valid = {
  CAL_EVENT_TYPE_ID: /^\d{1,20}$/, CAL_EVENT_TYPE_SLUG: /^[a-z0-9][a-z0-9-]{1,119}$/,
  CAL_ORGANIZER_USERNAME: /^[a-z0-9][a-z0-9._-]{1,119}$/,
  BOOKING_LOCK_WORKER_URL: /^https:\/\/[A-Za-z0-9.-]+\/?$/,
  META_DATASET_ID: /^\d{6,32}$/, META_GRAPH_API_VERSION: /^v\d+\.\d+$/,
}
for (const [name, pattern] of Object.entries(valid)) {
  if (process.env[name] && !pattern.test(process.env[name].trim())) {
    console.error(`INVALID ${name}: unsupported format`); failed = true
  }
}
for (const name of ["BOOKING_LOCK_HMAC_SECRET", "BOOKING_LOCK_HASH_SECRET", "META_CAPI_ACCESS_TOKEN"]) {
  if (process.env[name] && process.env[name].trim().length < 32) {
    console.error(`INVALID ${name}: must be at least 32 characters`); failed = true
  }
}
if (process.env.BOOKING_LOCK_HMAC_SECRET && process.env.BOOKING_LOCK_HMAC_SECRET.trim() === process.env.BOOKING_LOCK_HASH_SECRET?.trim()) {
  console.error("INVALID BOOKING_LOCK_HASH_SECRET: transport and digest keys must differ"); failed = true
}
try {
  const rows = JSON.parse(process.env.META_ATTRIBUTION_ALLOWLIST_JSON || "null")
  if (!Array.isArray(rows) || !rows.length || rows.length > 100) throw new Error()
  const seen = new Set()
  for (const row of rows) {
    if (!row || [row.campaignId, row.adSetId, row.adId].some(id => typeof id !== "string" || !/^\d{6,32}$/.test(id))
      || typeof row.creativeLabel !== "string" || !/^[A-Za-z0-9][A-Za-z0-9 _.-]{1,119}$/.test(row.creativeLabel.trim()) || seen.has(row.adId)) throw new Error()
    seen.add(row.adId)
  }
} catch {
  console.error("INVALID META_ATTRIBUTION_ALLOWLIST_JSON: expected nonempty unique exact mappings"); failed = true
}
if (process.env.META_CAPI_TEST_EVENT_CODE?.trim()) {
  console.error("INVALID META_CAPI_TEST_EVENT_CODE: remove the temporary test code before live cutover"); failed = true
}
if (failed) process.exitCode = 1
else console.log("Presence checks passed. Provider access and delivery still require controlled integration tests.")
