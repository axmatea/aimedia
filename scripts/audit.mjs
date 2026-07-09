#!/usr/bin/env node
/**
 * Local quality audit for aimedia.global.
 *
 * Pipeline:
 *   1. next build
 *   2. next start -p 4173
 *   3. For each page (/, /privacy-policy, /cookies, /legal):
 *      - save rendered HTML snapshot to docs/audit/
 *      - html-validate the snapshot
 *      - axe accessibility scan (JSON report)
 *   4. Lighthouse CI (collect + filesystem upload) for all pages
 *   5. Kill the server, print a summary table
 *
 * The script is informational: it ALWAYS exits 0. Failures in any tool are
 * recorded in the summary instead of breaking the run.
 *
 * Usage: npm run audit
 */

import { spawn, spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, "docs", "audit")
const PORT = 4173
const BASE = `http://localhost:${PORT}`

const PAGES = [
  { route: "/", slug: "home" },
  { route: "/privacy-policy", slug: "privacy-policy" },
  { route: "/cookies", slug: "cookies" },
  { route: "/legal", slug: "legal" },
]

const summary = []
let server = null

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf-8", ...opts })
  return {
    ok: res.status === 0,
    stdout: res.stdout || "",
    stderr: res.stderr || "",
    status: res.status,
  }
}

/**
 * fetch with retry. `next start` (plain Node http server) closes idle
 * keep-alive sockets after ~5s. The html-validate + axe steps between page
 * fetches take longer than that, so undici's pooled socket is dead by the
 * next fetch and the request fails with ECONNRESET ("fetch failed"). This is
 * why the /privacy-policy snapshot failed intermittently: it was simply the
 * second page fetched after a long gap. A short retry makes the snapshot
 * step deterministic.
 */
async function fetchWithRetry(url, attempts = 3) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url)
    } catch (err) {
      lastErr = err
      await new Promise(r => setTimeout(r, 750))
    }
  }
  const cause = lastErr?.cause?.code || lastErr?.cause?.message || ""
  throw new Error(`${lastErr?.message}${cause ? ` (${cause})` : ""}`)
}

async function waitForServer(timeoutMs = 60000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE, { redirect: "manual" })
      if (res.status > 0) return true
    } catch {
      /* not up yet */
    }
    await new Promise(r => setTimeout(r, 500))
  }
  return false
}

function killServer() {
  if (server && !server.killed) {
    try {
      process.kill(-server.pid, "SIGTERM")
    } catch {
      try { server.kill("SIGTERM") } catch { /* already gone */ }
    }
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  // 1. Build
  console.log("[audit] next build ...")
  const build = run("npx", ["next", "build"], { stdio: "inherit", encoding: undefined })
  if (!build.ok) {
    console.error("[audit] build failed, aborting audit (exit 0 by design)")
    return
  }

  // 2. Start server
  console.log(`[audit] next start -p ${PORT} ...`)
  server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: ROOT,
    detached: true,
    stdio: "ignore",
  })
  server.unref()
  const up = await waitForServer()
  if (!up) {
    console.error("[audit] server did not come up on :4173, aborting (exit 0 by design)")
    killServer()
    return
  }

  // 3. Per-page checks
  for (const page of PAGES) {
    const row = { page: page.route, snapshot: "-", htmlValidate: "-", axe: "-" }
    const url = `${BASE}${page.route}`

    // HTML snapshot (retried: next start drops idle keep-alive sockets, see fetchWithRetry)
    const htmlFile = path.join(OUT_DIR, `${page.slug}.html`)
    try {
      const res = await fetchWithRetry(url)
      const html = await res.text()
      writeFileSync(htmlFile, html)
      row.snapshot = `${(html.length / 1024).toFixed(0)} KB`
    } catch (err) {
      row.snapshot = `FAIL (${err.message})`
    }

    // html-validate on the snapshot. Ruleset lives in .htmlvalidate.mjs,
    // tuned for React/Next SSR output (rationale documented there). Passed
    // explicitly so validation never depends on config discovery.
    if (existsSync(htmlFile)) {
      const hv = run("npx", ["html-validate", "--config", ".htmlvalidate.mjs", "--formatter", "text", htmlFile])
      writeFileSync(path.join(OUT_DIR, `${page.slug}.html-validate.txt`), hv.stdout + hv.stderr)
      if (hv.ok) {
        row.htmlValidate = "0 errors"
      } else {
        // count "error [rule-name]" markers only, not every occurrence of the word
        const matches = (hv.stdout.match(/error \[/g) || []).length
        row.htmlValidate = hv.status === 1 ? `${matches || "some"} error(s)` : `tool failed (${hv.status})`
      }
    }

    // axe scan (needs a local Chrome/chromedriver; skip gracefully if missing)
    const axe = run("npx", ["axe", url, "--stdout", "--timeout", "90"])
    if (axe.ok && axe.stdout.trim().startsWith("[")) {
      writeFileSync(path.join(OUT_DIR, `${page.slug}.axe.json`), axe.stdout)
      try {
        const parsed = JSON.parse(axe.stdout)
        const violations = parsed.reduce((n, r) => n + (r.violations?.length || 0), 0)
        row.axe = `${violations} violation(s)`
      } catch {
        row.axe = "saved (unparsed)"
      }
    } else {
      writeFileSync(path.join(OUT_DIR, `${page.slug}.axe.error.txt`), axe.stdout + axe.stderr)
      row.axe = "SKIPPED (axe/chromedriver unavailable)"
    }

    summary.push(row)
  }

  // 4. Lighthouse CI: collect all pages, upload reports to the filesystem
  console.log("[audit] lighthouse ci ...")
  const lhciDir = path.join(OUT_DIR, "lhci")
  mkdirSync(lhciDir, { recursive: true })
  const collectArgs = ["lhci", "collect", "--numberOfRuns=1", ...PAGES.map(p => `--url=${BASE}${p.route}`)]
  const collect = run("npx", collectArgs)
  let lhciNote = "SKIPPED (collect failed, see docs/audit/lhci.error.txt)"
  if (collect.ok) {
    const upload = run("npx", ["lhci", "upload", "--target=filesystem", `--outputDir=${lhciDir}`])
    if (upload.ok) {
      lhciNote = `reports in docs/audit/lhci/`
      try {
        const manifest = JSON.parse(readFileSync(path.join(lhciDir, "manifest.json"), "utf-8"))
        for (const entry of manifest) {
          const route = entry.url.replace(BASE, "") || "/"
          const row = summary.find(r => r.page === route)
          if (row && entry.summary) {
            row.lighthouse = `perf ${Math.round(entry.summary.performance * 100)} / a11y ${Math.round(entry.summary.accessibility * 100)} / bp ${Math.round(entry.summary["best-practices"] * 100)} / seo ${Math.round(entry.summary.seo * 100)}`
          }
        }
      } catch {
        /* manifest parse is best-effort */
      }
    } else {
      lhciNote = "SKIPPED (upload failed, see docs/audit/lhci.error.txt)"
      writeFileSync(path.join(OUT_DIR, "lhci.error.txt"), upload.stdout + upload.stderr)
    }
  } else {
    writeFileSync(path.join(OUT_DIR, "lhci.error.txt"), collect.stdout + collect.stderr)
  }

  // 5. Teardown + summary
  killServer()

  console.log("\n[audit] summary")
  console.log("page                 | snapshot   | html-validate      | axe                                  | lighthouse")
  console.log("---------------------|------------|--------------------|--------------------------------------|-----------")
  for (const row of summary) {
    console.log(
      `${row.page.padEnd(20)} | ${String(row.snapshot).padEnd(10)} | ${String(row.htmlValidate).padEnd(18)} | ${String(row.axe).padEnd(36)} | ${row.lighthouse || "-"}`
    )
  }
  console.log(`\n[audit] lighthouse: ${lhciNote}`)
  console.log(`[audit] all reports: docs/audit/ (gitignored)`)
}

main()
  .catch(err => {
    console.error("[audit] unexpected error:", err)
  })
  .finally(() => {
    killServer()
    process.exit(0)
  })
