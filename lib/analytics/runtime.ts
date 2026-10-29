import "server-only"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import type { AnalyticsDatabase, AnalyticsRuntime } from "./store.ts"

/** Bindings exist only inside a Worker request, never during static rendering/tests. */
export function getAnalyticsRuntime(): AnalyticsRuntime | null {
  try {
    const { env, ctx } = getCloudflareContext()
    const binding = env as unknown as { ANALYTICS_DB?: AnalyticsDatabase; ANALYTICS_ENVIRONMENT?: string }
    if (!binding.ANALYTICS_DB || typeof binding.ANALYTICS_DB.prepare !== "function") return null
    if (binding.ANALYTICS_ENVIRONMENT !== "production" && binding.ANALYTICS_ENVIRONMENT !== "staging") return null
    return {
      db: binding.ANALYTICS_DB,
      environment: binding.ANALYTICS_ENVIRONMENT,
      waitUntil: task => ctx.waitUntil(task),
    }
  } catch { return null }
}
