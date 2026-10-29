import { analyticsPost } from "@/lib/analytics/http"
import { getAnalyticsRuntime } from "@/lib/analytics/runtime"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function POST(request: Request) {
  return analyticsPost(request, getAnalyticsRuntime())
}
