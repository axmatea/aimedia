import crypto from "node:crypto"
import { BookingDeadline } from "./booking-deadline.ts"

type ReservationResponse = {
  status?: "ACQUIRED" | "COMMITTED" | "RESERVED" | "CONFLICT"
  operationId?: string
  canonicalRef?: string
}

export type BookingReservation =
  | { mode: "acquired"; operationId: string }
  | { mode: "committed"; canonicalRef: string }

export class BookingLockError extends Error {
  readonly code:
    | "booking_lock_unavailable"
    | "booking_lock_busy"
    | "booking_lock_conflict"
    | "booking_lock_mapping_conflict"

  constructor(code: BookingLockError["code"]) {
    super(code)
    this.name = "BookingLockError"
    this.code = code
  }
}

function config() {
  const url = process.env.BOOKING_LOCK_WORKER_URL?.trim() || ""
  const requestSecret = process.env.BOOKING_LOCK_HMAC_SECRET?.trim() || ""
  const hashSecret = process.env.BOOKING_LOCK_HASH_SECRET?.trim() || ""
  if (
    !/^https:\/\/[A-Za-z0-9.-]+\/?$/.test(url)
    || requestSecret.length < 32
    || hashSecret.length < 32
    || requestSecret === hashSecret
  ) {
    throw new BookingLockError("booking_lock_unavailable")
  }
  return { url: url.replace(/\/$/, ""), requestSecret, hashSecret }
}

function privateDigest(secret: string, domain: "booking_uid" | "email", value: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(`aimedia-booking-lock:v1:${domain}\0${value}`)
    .digest("hex")
}

export function bookingReservationHashes(
  input: { bookingUid: string; email: string },
  hashSecret = process.env.BOOKING_LOCK_HASH_SECRET?.trim() || "",
) {
  if (hashSecret.length < 32) {
    throw new BookingLockError("booking_lock_unavailable")
  }
  return {
    bookingUidHash: privateDigest(hashSecret, "booking_uid", input.bookingUid),
    emailHash: privateDigest(hashSecret, "email", input.email.trim().toLowerCase()),
  }
}

async function signedRequest(path: string, payload: Record<string, string>, deadline: BookingDeadline) {
  const { url, requestSecret } = config()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const body = JSON.stringify(payload)
  const signature = crypto
    .createHmac("sha256", requestSecret)
    .update(`${timestamp}.${body}`)
    .digest("hex")
  const response = await deadline.fetch(`${url}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AIMG-Timestamp": timestamp,
      "X-AIMG-Signature": `sha256=${signature}`,
    },
    body,
    cache: "no-store",
  })
  const result = await deadline.json(response).catch((error) => { deadline.check(); throw error }) as ReservationResponse
  return { response, result }
}

async function reserve(input: { bookingUid: string; email: string }, deadline: BookingDeadline) {
  const { hashSecret } = config()
  const hashes = bookingReservationHashes(input, hashSecret)
  const operationId = crypto.randomUUID()
  const { response, result } = await signedRequest("/v1/reserve", {
    ...hashes,
    operationId,
  }, deadline)
  if (response.status === 201 && result.status === "ACQUIRED" && result.operationId === operationId) {
    return { reservation: { mode: "acquired", operationId } as const, hashes }
  }
  if (
    response.ok
    && result.status === "COMMITTED"
    && typeof result.canonicalRef === "string"
    && /^[a-f0-9]{16}$/.test(result.canonicalRef)
  ) {
    return {
      reservation: { mode: "committed", canonicalRef: result.canonicalRef } as const,
      hashes,
    }
  }
  if (response.status === 409 && result.status === "RESERVED") {
    throw new BookingLockError("booking_lock_busy")
  }
  if (response.status === 409 && result.status === "CONFLICT") {
    throw new BookingLockError("booking_lock_conflict")
  }
  throw new BookingLockError("booking_lock_unavailable")
}

async function commit(input: {
  bookingUidHash: string
  emailHash: string
  operationId: string
  canonicalRef: string
}, deadline: BookingDeadline) {
  const { response, result } = await signedRequest("/v1/commit", input, deadline)
  if (
    response.ok
    && result.status === "COMMITTED"
    && result.canonicalRef === input.canonicalRef
  ) return
  throw new BookingLockError("booking_lock_mapping_conflict")
}

export async function withBookingMutationLock<T extends { canonicalRef: string }>(
  input: { bookingUid: string; email: string },
  operation: (reservation: BookingReservation) => Promise<T>,
  sharedDeadline?: BookingDeadline,
) {
  const deadline = sharedDeadline ?? new BookingDeadline()
  try {
  deadline.check()
  const { reservation, hashes } = await reserve(input, deadline)
  const result = await deadline.wait(() => operation(reservation))
  if (reservation.mode === "committed") {
    if (result.canonicalRef !== reservation.canonicalRef) {
      throw new BookingLockError("booking_lock_mapping_conflict")
    }
    return result
  }
  await commit({
    ...hashes,
    operationId: reservation.operationId,
    canonicalRef: result.canonicalRef,
  }, deadline)
  return result
  } finally {
    if (!sharedDeadline) deadline.dispose()
  }
}
