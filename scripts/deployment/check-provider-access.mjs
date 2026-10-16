import { readFileSync } from "node:fs"

// Run with the selected service's runtime variables. Read-only provider calls:
// no inquiries, bookings, email, CRM writes or reservation mutations.
async function read(url, headers = {}) {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) })
    return { status: response.status, body: await response.json().catch(() => null) }
  } catch { return { status: 0, body: null } }
}

const token = process.env.NOTION_TOKEN
const databaseId = process.env.NOTION_LEADS_DB_ID
if (token && databaseId) {
  const headers = { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" }
  const identity = await read("https://api.notion.com/v1/users/me", headers)
  const schema = await read(`https://api.notion.com/v1/databases/${databaseId}`, headers)
  const source = readFileSync(new URL("../../lib/conversion/notion-bookings.ts", import.meta.url), "utf8")
  const contract = source.match(/const REQUIRED_BOOKING_SCHEMA[^=]*=\s*\{([\s\S]*?)\n\}/)?.[1] || ""
  const required = [...contract.matchAll(/^\s*(?:"([^"]+)"|([A-Za-z]+)):\s*"([^"]+)"/gm)]
    .map(match => [match[1] || match[2], match[3]])
  const missing = required.filter(([name, type]) => schema.body?.properties?.[name]?.type !== type)
    .map(([name]) => name)
  console.log(JSON.stringify({ check: "notion", identityStatus: identity.status,
    naylSystems: /nayl systems/i.test(identity.body?.name || ""), schemaStatus: schema.status,
    expectedFields: required.length, missingFields: missing }))
} else console.log(JSON.stringify({ check: "notion", configured: false }))

if (process.env.RESEND_API_KEY) {
  const headers = { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
  const domains = await read("https://api.resend.com/domains", headers)
  const domain = domains.body?.data?.find(row => row.name === "aimedia.global")
  const hooks = await read("https://api.resend.com/webhooks", headers)
  const rows = Array.isArray(hooks.body?.data) ? hooks.body.data : []
  console.log(JSON.stringify({ check: "resend", domainsStatus: domains.status,
    senderDomainVerified: domain?.status === "verified", webhooksStatus: hooks.status,
    domainWebhookCount: rows.filter(row => { try { return ["aimedia.global", "www.aimedia.global"].includes(new URL(row.endpoint).hostname) } catch { return false } }).length,
    vercelWebhookCount: rows.filter(row => String(row.endpoint).includes(".vercel.app")).length,
    emailsSent: 0 }))
} else console.log(JSON.stringify({ check: "resend", configured: false }))

const workerUrl = process.env.BOOKING_LOCK_WORKER_URL
if (workerUrl && /^https:\/\/[A-Za-z0-9.-]+\/?$/.test(workerUrl)) {
  const worker = await read(`${workerUrl.replace(/\/$/, "")}/health`)
  console.log(JSON.stringify({ check: "booking_lock", status: worker.status,
    processHealthy: worker.body?.ok === true, authenticatedReservationTested: false }))
} else console.log(JSON.stringify({ check: "booking_lock", configured: false }))

console.log(JSON.stringify({ sheetsWriteTested: false, realBookingsCreated: 0,
  note: "Read access does not prove provider writes or a completed booking. Missing signing keys block cutover." }))
