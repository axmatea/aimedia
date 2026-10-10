#!/usr/bin/env node

function validAllowlist(raw) {
  try {
    const value = JSON.parse(raw)
    return Array.isArray(value) && value.length > 0
  } catch {
    return false
  }
}

const checks = {
  CAL_WEBHOOK_SECRET: (process.env.CAL_WEBHOOK_SECRET || "").trim().length >= 32,
  CAL_EVENT_TYPE_ID: /^\d{1,20}$/.test((process.env.CAL_EVENT_TYPE_ID || "").trim()),
  CAL_EVENT_TYPE_SLUG: /^[a-z0-9][a-z0-9-]{1,119}$/.test((process.env.CAL_EVENT_TYPE_SLUG || "").trim()),
  CAL_ORGANIZER_USERNAME: /^[a-z0-9][a-z0-9._-]{1,119}$/.test((process.env.CAL_ORGANIZER_USERNAME || "").trim()),
  NOTION_TOKEN: Boolean((process.env.NOTION_TOKEN || "").trim()),
  NOTION_LEADS_DB_ID: Boolean((process.env.NOTION_LEADS_DB_ID || "").trim()),
  BOOKING_LOCK_WORKER_URL: /^https:\/\//.test((process.env.BOOKING_LOCK_WORKER_URL || "").trim()),
  BOOKING_LOCK_HMAC_SECRET: (process.env.BOOKING_LOCK_HMAC_SECRET || "").trim().length >= 32,
  BOOKING_LOCK_HASH_SECRET: (
    (process.env.BOOKING_LOCK_HASH_SECRET || "").trim().length >= 32
    && (process.env.BOOKING_LOCK_HASH_SECRET || "").trim()
      !== (process.env.BOOKING_LOCK_HMAC_SECRET || "").trim()
  ),
  META_DATASET_ID: /^\d{6,32}$/.test((process.env.META_DATASET_ID || "").trim()),
  META_CAPI_ACCESS_TOKEN: (process.env.META_CAPI_ACCESS_TOKEN || "").trim().length >= 32,
  META_GRAPH_API_VERSION: /^v\d+\.\d+$/.test((process.env.META_GRAPH_API_VERSION || "").trim()),
  META_ATTRIBUTION_ALLOWLIST_JSON: validAllowlist(process.env.META_ATTRIBUTION_ALLOWLIST_JSON || ""),
}
const missing = Object.entries(checks)
  .filter(([, ready]) => !ready)
  .map(([name]) => name)

console.log(JSON.stringify({
  ok: missing.length === 0,
  checks,
  missing,
  note: "Presence-only check. No secret values are printed and no network call is made.",
}, null, 2))

if (missing.length) process.exitCode = 1
