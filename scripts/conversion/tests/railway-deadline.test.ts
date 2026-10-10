import assert from "node:assert/strict"
import test from "node:test"
import { getEventListeners } from "node:events"
import { BookingBodyTooLargeError, BookingDeadline, BookingDeadlineError } from "../../../lib/conversion/booking-deadline.ts"
import { withBookingMutationLock } from "../../../lib/conversion/booking-lock.ts"

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

test("one monotonic budget fences subsequent calls even before its timer fires", async () => {
  let now = 0
  const deadline = new BookingDeadline({ timeoutMs: 100, now: () => now })
  let calls = 0
  try {
    assert.equal(await deadline.wait(async () => { calls++; now = 60; return "first" }), "first")
    await assert.rejects(deadline.wait(async () => { calls++; now = 101; return "late" }), BookingDeadlineError)
    await assert.rejects(deadline.wait(async () => { calls++; return "forbidden" }), BookingDeadlineError)
    assert.equal(calls, 2)
  } finally { deadline.dispose() }
})

test("an uncooperative late transport cannot start a following mutation", async () => {
  const parent = new AbortController()
  const deadline = new BookingDeadline({ signal: parent.signal })
  const late = deferred<string>()
  let mutations = 0
  try {
    const workflow = (async () => { await deadline.wait(() => late.promise); await deadline.wait(async () => { mutations++ }) })()
    parent.abort()
    await assert.rejects(workflow, BookingDeadlineError)
    late.resolve("accepted remotely")
    await Promise.resolve()
    assert.equal(mutations, 0)
    assert.equal(getEventListeners(deadline.signal, "abort").length, 0)
  } finally { deadline.dispose() }
})

test("timer expiry bounds a hanging provider body and a retry delay", async () => {
  const deadline = new BookingDeadline({ timeoutMs: 15 })
  const response = new Response(new ReadableStream({ start() {} }))
  try {
    await assert.rejects(deadline.json(response), BookingDeadlineError)
    await assert.rejects(deadline.delay(350), BookingDeadlineError)
  } finally { deadline.dispose() }
})

test("retry sleeps abort without another attempt", async () => {
  const controller = new AbortController()
  const deadline = new BookingDeadline({ signal: controller.signal })
  let retry = 0
  const pending = deadline.delay(350).then(() => { retry++ })
  controller.abort()
  await assert.rejects(pending, BookingDeadlineError)
  assert.equal(retry, 0)
  deadline.dispose()
})

test("streaming limit handles missing or dishonest Content-Length", async () => {
  for (const headers of [{}, { "content-length": "1" }]) {
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(8)); controller.enqueue(new Uint8Array(8)) },
      cancel() { cancelled = true },
    })
    const request = new Request("https://example.invalid", { method: "POST", headers, body, duplex: "half" } as RequestInit)
    const deadline = new BookingDeadline()
    try {
      await assert.rejects(deadline.readBody(request, 10), BookingBodyTooLargeError)
      assert.equal(cancelled, true)
    } finally { deadline.dispose() }
  }
})

test("hanging inbound stream is cancelled on deadline", async () => {
  let cancelled = false
  const request = new Request("https://example.invalid", {
    method: "POST", body: new ReadableStream({ cancel() { cancelled = true } }), duplex: "half",
  } as RequestInit)
  const deadline = new BookingDeadline({ timeoutMs: 15 })
  try {
    await assert.rejects(deadline.readBody(request, 100), BookingDeadlineError)
    assert.equal(cancelled, true)
  } finally { deadline.dispose() }
})

test("normal multibyte body survives streaming and cleanup removes listeners", async () => {
  const parent = new AbortController()
  const deadline = new BookingDeadline({ signal: parent.signal })
  assert.equal(await deadline.readBody(new Request("https://example.invalid", { method: "POST", body: "héllo" }), 6), "héllo")
  assert.equal(getEventListeners(parent.signal, "abort").length, 1)
  deadline.dispose()
  assert.equal(getEventListeners(parent.signal, "abort").length, 0)
  assert.equal(getEventListeners(deadline.signal, "abort").length, 0)
})

test("request budgets and signals are isolated", async () => {
  const one = new BookingDeadline(), two = new BookingDeadline()
  one.dispose()
  await assert.rejects(one.wait(async () => 1), BookingDeadlineError)
  assert.equal(await two.wait(async () => 2), 2)
  two.dispose()
})

test("expired reservation workflow never commits or unlocks an uncertain write", async () => {
  const saved = { fetch: globalThis.fetch, env: { ...process.env } }
  process.env.BOOKING_LOCK_WORKER_URL = "https://lock.example.invalid"
  process.env.BOOKING_LOCK_HMAC_SECRET = "test-request-key-".repeat(3)
  process.env.BOOKING_LOCK_HASH_SECRET = "test-digest-key-".repeat(3)
  const paths: string[] = []
  let now = 0
  const deadline = new BookingDeadline({ timeoutMs: 100, now: () => now })
  globalThis.fetch = (async (input, init) => {
    assert.equal(init?.signal, deadline.signal)
    paths.push(new URL(String(input)).pathname)
    const { operationId } = JSON.parse(String(init?.body))
    return Response.json({ status: "ACQUIRED", operationId }, { status: 201 })
  }) as typeof fetch
  try {
    await assert.rejects(withBookingMutationLock({ bookingUid: "fixture", email: "test@example.invalid" }, async () => {
      now = 101 // Remote CRM may have accepted this operation before the response arrived.
      return { canonicalRef: "0123456789abcdef" }
    }, deadline), BookingDeadlineError)
    assert.deepEqual(paths, ["/v1/reserve"])
  } finally {
    deadline.dispose(); globalThis.fetch = saved.fetch
    for (const name of ["BOOKING_LOCK_WORKER_URL", "BOOKING_LOCK_HMAC_SECRET", "BOOKING_LOCK_HASH_SECRET"]) {
      if (saved.env[name] === undefined) delete process.env[name]; else process.env[name] = saved.env[name]
    }
  }
})
