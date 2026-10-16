import { chownSync, lstatSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"

process.umask(0o077)
if (process.getuid?.() === 0) {
  const databasePath = process.env.ANALYTICS_DB_PATH?.trim()
  if (databasePath) {
    // Never recursively change ownership or accept arbitrary root paths.
    if (dirname(resolve(databasePath)) !== "/data") {
      throw new Error("Analytics volume must be mounted at /data")
    }
    mkdirSync("/data", { recursive: true, mode: 0o700 })
    if (lstatSync("/data").isSymbolicLink()) throw new Error("Invalid analytics mount")
    chownSync("/data", 1000, 1000)
  }
  process.setgid("node")
  process.setuid("node")
}

await import("../server.js")
