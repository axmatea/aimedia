// Run inside the intended runtime, after secure configuration. Values are never
// printed or sent anywhere. This is a cutover gate, not a build requirement.
const required = [
  "RESEND_API_KEY", "NOTION_TOKEN", "SHEETS_WEBHOOK_URL",
  "MARK_CONTACTED_SECRET", "CANCEL_FOLLOWUPS_SECRET", "RESEND_WEBHOOK_SECRET",
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
console.log(`OPTIONAL NOTION_LEADS_DB_ID: ${process.env.NOTION_LEADS_DB_ID ? "SET" : "DEFAULT"}`)
if (failed) process.exitCode = 1
else console.log("Presence checks passed. Provider access and delivery still require controlled integration tests.")
