import assert from "node:assert/strict"
import test from "node:test"

import {
  BookingLockError,
  bookingReservationHashes,
  withBookingMutationLock,
} from "../../../lib/conversion/booking-lock.ts"

const TEST_HMAC_SECRET = "test-hmac-".repeat(4)
const TEST_HASH_SECRET = "test-hash-".repeat(4)

function fakeWorker() {
  let row: null | {
    bookingUidHash: string
    emailHash: string
    operationId: string
    canonicalRef: string
    state: "RESERVED" | "COMMITTED"
  } = null
  return async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    const payload = JSON.parse(String(init?.body)) as Record<string, string>
    assert.match(String(new Headers(init?.headers).get("x-aimg-signature")), /^sha256=[a-f0-9]{64}$/)
    assert.match(String(new Headers(init?.headers).get("x-aimg-timestamp")), /^\d{10}$/)

    if (url.pathname === "/v1/reserve") {
      if (!row) {
        row = {
          bookingUidHash: payload.bookingUidHash,
          emailHash: payload.emailHash,
          operationId: payload.operationId,
          canonicalRef: "",
          state: "RESERVED",
        }
        return Response.json({ status: "ACQUIRED", operationId: payload.operationId }, { status: 201 })
      }
      if (row.bookingUidHash !== payload.bookingUidHash || row.emailHash !== payload.emailHash) {
        return Response.json({ status: "CONFLICT" }, { status: 409 })
      }
      if (row.state === "RESERVED") {
        return Response.json({ status: "RESERVED" }, { status: 409 })
      }
      return Response.json({ status: "COMMITTED", canonicalRef: row.canonicalRef })
    }

    if (
      row
      && row.state === "RESERVED"
      && row.operationId === payload.operationId
      && row.bookingUidHash === payload.bookingUidHash
      && row.emailHash === payload.emailHash
    ) {
      row.state = "COMMITTED"
      row.canonicalRef = payload.canonicalRef
      return Response.json({ status: "COMMITTED", canonicalRef: row.canonicalRef })
    }
    return Response.json({ status: "CONFLICT" }, { status: 409 })
  }
}

function withEnvironment(fetchImpl: typeof fetch) {
  const original = {
    fetch: globalThis.fetch,
    url: process.env.BOOKING_LOCK_WORKER_URL,
    secret: process.env.BOOKING_LOCK_HMAC_SECRET,
    hashSecret: process.env.BOOKING_LOCK_HASH_SECRET,
  }
  process.env.BOOKING_LOCK_WORKER_URL = "https://booking-lock.example.invalid"
  process.env.BOOKING_LOCK_HMAC_SECRET = TEST_HMAC_SECRET
  process.env.BOOKING_LOCK_HASH_SECRET = TEST_HASH_SECRET
  globalThis.fetch = fetchImpl
  return () => {
    globalThis.fetch = original.fetch
    if (original.url === undefined) delete process.env.BOOKING_LOCK_WORKER_URL
    else process.env.BOOKING_LOCK_WORKER_URL = original.url
    if (original.secret === undefined) delete process.env.BOOKING_LOCK_HMAC_SECRET
    else process.env.BOOKING_LOCK_HMAC_SECRET = original.secret
    if (original.hashSecret === undefined) delete process.env.BOOKING_LOCK_HASH_SECRET
    else process.env.BOOKING_LOCK_HASH_SECRET = original.hashSecret
  }
}

test("sends only domain-separated keyed UID and canonical-email digests", () => {
  const secret = TEST_HASH_SECRET
  const input = { bookingUid: "uid-123", email: "Owner@Example.invalid" }
  const hashes = bookingReservationHashes(input, secret)
  const replay = bookingReservationHashes(input, secret)
  const otherSecret = bookingReservationHashes(input, "a-different-private-hash-secret-with-32-characters")
  assert.match(hashes.bookingUidHash, /^[a-f0-9]{64}$/)
  assert.match(hashes.emailHash, /^[a-f0-9]{64}$/)
  assert.deepEqual(replay, hashes)
  assert.notEqual(otherSecret.emailHash, hashes.emailHash)
  assert.notEqual(hashes.bookingUidHash, hashes.emailHash)
  assert.equal(JSON.stringify(hashes).includes("uid-123"), false)
  assert.equal(JSON.stringify(hashes).includes("Owner@Example.invalid"), false)
})

test("reserves, commits, and verifies a canonical replay mapping", async () => {
  const restore = withEnvironment(fakeWorker() as typeof fetch)
  try {
    const input = { bookingUid: "uid-123", email: "owner@example.invalid" }
    const first = await withBookingMutationLock(input, async (reservation) => {
      assert.equal(reservation.mode, "acquired")
      return { canonicalRef: "0123456789abcdef", created: true }
    })
    assert.equal(first.created, true)

    const replay = await withBookingMutationLock(input, async (reservation) => {
      assert.deepEqual(reservation, { mode: "committed", canonicalRef: "0123456789abcdef" })
      return { canonicalRef: "0123456789abcdef", created: false }
    })
    assert.equal(replay.created, false)
  } finally {
    restore()
  }
})

test("a concurrent reservation or different UID for the same email fails closed", async () => {
  const restore = withEnvironment(fakeWorker() as typeof fetch)
  try {
    const input = { bookingUid: "uid-123", email: "owner@example.invalid" }
    let releaseFirst!: () => void
    const firstCanFinish = new Promise<void>((resolve) => { releaseFirst = resolve })
    const first = withBookingMutationLock(input, async () => {
      await firstCanFinish
      return { canonicalRef: "0123456789abcdef" }
    })
    await new Promise((resolve) => setTimeout(resolve, 0))

    await assert.rejects(
      withBookingMutationLock(input, async () => ({ canonicalRef: "0123456789abcdef" })),
      (error) => error instanceof BookingLockError && error.code === "booking_lock_busy",
    )
    await assert.rejects(
      withBookingMutationLock(
        { bookingUid: "uid-456", email: input.email },
        async () => ({ canonicalRef: "fedcba9876543210" }),
      ),
      (error) => error instanceof BookingLockError && error.code === "booking_lock_conflict",
    )
    releaseFirst()
    await first
  } finally {
    restore()
  }
})

test("a committed reservation cannot be rebound to another canonical record", async () => {
  const restore = withEnvironment(fakeWorker() as typeof fetch)
  try {
    const input = { bookingUid: "uid-123", email: "owner@example.invalid" }
    await withBookingMutationLock(input, async () => ({ canonicalRef: "0123456789abcdef" }))
    await assert.rejects(
      withBookingMutationLock(input, async () => ({ canonicalRef: "fedcba9876543210" })),
      (error) => error instanceof BookingLockError && error.code === "booking_lock_mapping_conflict",
    )
  } finally {
    restore()
  }
})

test("fails closed when the dedicated Worker is not configured", async () => {
  const originalUrl = process.env.BOOKING_LOCK_WORKER_URL
  const originalSecret = process.env.BOOKING_LOCK_HMAC_SECRET
  const originalHashSecret = process.env.BOOKING_LOCK_HASH_SECRET
  delete process.env.BOOKING_LOCK_WORKER_URL
  delete process.env.BOOKING_LOCK_HMAC_SECRET
  delete process.env.BOOKING_LOCK_HASH_SECRET
  try {
    await assert.rejects(
      withBookingMutationLock(
        { bookingUid: "uid-123", email: "owner@example.invalid" },
        async () => ({ canonicalRef: "0123456789abcdef" }),
      ),
      (error) => error instanceof BookingLockError && error.code === "booking_lock_unavailable",
    )
  } finally {
    if (originalUrl !== undefined) process.env.BOOKING_LOCK_WORKER_URL = originalUrl
    if (originalSecret !== undefined) process.env.BOOKING_LOCK_HMAC_SECRET = originalSecret
    if (originalHashSecret !== undefined) process.env.BOOKING_LOCK_HASH_SECRET = originalHashSecret
  }
})

test("fails closed when transport and digest secrets are reused", async () => {
  const restore = withEnvironment(fakeWorker() as typeof fetch)
  process.env.BOOKING_LOCK_HASH_SECRET = process.env.BOOKING_LOCK_HMAC_SECRET
  try {
    await assert.rejects(
      withBookingMutationLock(
        { bookingUid: "uid-123", email: "owner@example.invalid" },
        async () => ({ canonicalRef: "0123456789abcdef" }),
      ),
      (error) => error instanceof BookingLockError && error.code === "booking_lock_unavailable",
    )
  } finally {
    restore()
  }
})
