/**
 * One-time Gmail OAuth — gets a fresh refresh token with gmail.modify scope
 * and writes GMAIL_REFRESH_TOKEN to .env.production.local.
 *
 * Run:  node scripts/outreach/setup-gmail-oauth.mjs
 * Then open the printed URL, authorize info@aimedia.global, done.
 */
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { loadEnv, requireEnv } from "./lib/env.mjs"

loadEnv()
const CLIENT_ID = requireEnv("GOOGLE_CLIENT_ID")
const CLIENT_SECRET = requireEnv("GOOGLE_CLIENT_SECRET")
const PORT = 4567
const REDIRECT = `http://localhost:${PORT}/oauth2callback`
const SCOPE = "https://www.googleapis.com/auth/gmail.modify"
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_FILE = path.join(__dirname, "..", "..", ".env.production.local")

const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT,
  response_type: "code",
  scope: SCOPE,
  access_type: "offline",
  prompt: "consent",
})

console.log("\n══════════════════════════════════════════════════════════════")
console.log("  STEP 1 · Open this URL and authorize info@aimedia.global:")
console.log("══════════════════════════════════════════════════════════════\n")
console.log(authUrl.toString())
console.log("\n(redirect target: " + REDIRECT + ")")
console.log("Waiting for authorization…\n")

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/oauth2callback")) { res.writeHead(404); res.end(); return }
  const code = new URL(req.url, REDIRECT).searchParams.get("code")
  const err = new URL(req.url, REDIRECT).searchParams.get("error")
  if (err) { res.end(`OAuth error: ${err}`); console.error("OAuth error:", err); server.close(); process.exit(1) }
  if (!code) { res.end("No code"); return }

  const tok = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code, redirect_uri: REDIRECT, grant_type: "authorization_code" }),
  })
  const t = await tok.json()
  if (t.error) { res.end(`Token error: ${t.error}`); console.error("Token error:", t); server.close(); process.exit(1) }

  // persist refresh token
  let env = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8") : ""
  env = env.replace(/^GMAIL_REFRESH_TOKEN=.*$/m, "").trimEnd()
  env += `\nGMAIL_REFRESH_TOKEN=${t.refresh_token}\n`
  fs.writeFileSync(ENV_FILE, env)

  res.end("Authorized. Gmail refresh token saved. You can close this tab.")
  console.log("✓ refresh_token captured + saved to .env.production.local")
  console.log("✓ scope:", t.scope)
  // quick verify
  const prof = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", { headers: { Authorization: `Bearer ${t.access_token}` } })
  const p = await prof.json()
  console.log("✓ mailbox:", p.emailAddress || JSON.stringify(p).slice(0,120))
  server.close(); process.exit(0)
})
server.listen(PORT)
