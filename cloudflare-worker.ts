import { maybeServeVideoRequest, type AssetFetcher, type RangeCache } from "./lib/cloudflare/video-range"
import { maybeServeRobotScene } from "./lib/cloudflare/robot-scene"

// OpenNext creates this module during `npm run build:cloudflare`.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- Generated after Next.js type-checks the source tree.
import openNextWorker from "./.open-next/worker.js"

// Preserve the named entrypoints emitted by OpenNext for compatible cache and
// queue configurations, even though this release does not bind them yet.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- Generated after Next.js type-checks the source tree.
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js"

interface CloudflareWorkerEnv {
  ASSETS: AssetFetcher
  [key: string]: unknown
}

interface CloudflareExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}

interface CloudflareCacheStorage extends CacheStorage {
  default: RangeCache
}

const worker = {
  async fetch(request: Request, env: CloudflareWorkerEnv, ctx: CloudflareExecutionContext) {
    const robot = await maybeServeRobotScene(request, env.ASSETS)
    if (robot) return robot
    const video = await maybeServeVideoRequest(request, {
      assets: env.ASSETS,
      cache: (caches as CloudflareCacheStorage).default,
    })
    return video ?? openNextWorker.fetch(request, env, ctx)
  },
}

export default worker
