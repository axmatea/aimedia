// Persistence for references and content drafts.
//
// Primary backend: Upstash Redis over REST (no npm dependency — plain fetch).
// Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
//
// Fallback: in-memory maps. Fine for local dev, useless in production
// (serverless instances don't share memory) — a warning is logged once.

import type { ContentDraft, ReferenceItem } from "./types"

const REFERENCES_LIST = "ig:references"
const DRAFTS_LIST = "ig:drafts"

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url, token }
}

async function redis(command: (string | number)[]): Promise<unknown> {
  const cfg = redisConfig()
  if (!cfg) throw new Error("Redis is not configured")
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  })
  if (!res.ok) {
    throw new Error(`Redis command failed: ${res.status} ${await res.text()}`)
  }
  const data = (await res.json()) as { result: unknown }
  return data.result
}

// --- In-memory fallback (dev only) ---

const memoryKV = new Map<string, string>()
const memoryLists = new Map<string, string[]>()
let warnedAboutMemory = false

function warnMemory() {
  if (!warnedAboutMemory) {
    warnedAboutMemory = true
    console.warn(
      "[ig-agent] UPSTASH_REDIS_REST_URL not set — using in-memory store. Data will NOT persist in production."
    )
  }
}

async function kvSet(key: string, value: string): Promise<void> {
  if (redisConfig()) {
    await redis(["SET", key, value])
    return
  }
  warnMemory()
  memoryKV.set(key, value)
}

async function kvGet(key: string): Promise<string | null> {
  if (redisConfig()) {
    return (await redis(["GET", key])) as string | null
  }
  warnMemory()
  return memoryKV.get(key) ?? null
}

async function listPush(key: string, value: string): Promise<void> {
  if (redisConfig()) {
    await redis(["LPUSH", key, value])
    return
  }
  warnMemory()
  const list = memoryLists.get(key) ?? []
  list.unshift(value)
  memoryLists.set(key, list)
}

async function listRange(key: string, limit: number): Promise<string[]> {
  if (redisConfig()) {
    return (await redis(["LRANGE", key, 0, limit - 1])) as string[]
  }
  warnMemory()
  return (memoryLists.get(key) ?? []).slice(0, limit)
}

// --- References ---

export async function saveReference(ref: ReferenceItem): Promise<void> {
  await kvSet(`ig:reference:${ref.id}`, JSON.stringify(ref))
  await listPush(REFERENCES_LIST, ref.id)
}

export async function listReferences(limit = 20): Promise<ReferenceItem[]> {
  const ids = await listRange(REFERENCES_LIST, limit)
  const refs: ReferenceItem[] = []
  for (const id of ids) {
    const raw = await kvGet(`ig:reference:${id}`)
    if (raw) refs.push(JSON.parse(raw) as ReferenceItem)
  }
  return refs
}

// --- Drafts ---

export async function saveDraft(draft: ContentDraft): Promise<void> {
  await kvSet(`ig:draft:${draft.id}`, JSON.stringify(draft))
  await listPush(DRAFTS_LIST, draft.id)
}

export async function updateDraft(draft: ContentDraft): Promise<void> {
  await kvSet(`ig:draft:${draft.id}`, JSON.stringify(draft))
}

export async function getDraft(id: string): Promise<ContentDraft | null> {
  const raw = await kvGet(`ig:draft:${id}`)
  return raw ? (JSON.parse(raw) as ContentDraft) : null
}

export async function listDrafts(limit = 50): Promise<ContentDraft[]> {
  const ids = await listRange(DRAFTS_LIST, limit)
  const drafts: ContentDraft[] = []
  for (const id of ids) {
    const draft = await getDraft(id)
    if (draft) drafts.push(draft)
  }
  return drafts
}

// Oldest approved draft first — publish queue order.
export async function nextApprovedDraft(): Promise<ContentDraft | null> {
  const drafts = await listDrafts()
  const approved = drafts.filter((d) => d.status === "approved" && d.imageUrl)
  if (approved.length === 0) return null
  return approved[approved.length - 1]
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
