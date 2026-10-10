import assert from "node:assert/strict"
import test from "node:test"

import {
  BookingContractError,
  planBookingWrite,
  verifyBookingMapping,
} from "../../../lib/conversion/booking-contract.ts"

const record = {
  id: "canonical-record-1",
  bookingUid: "booking_uid_123",
  email: "founder@example.com",
}

test("creates a canonical record only when UID and email are both unseen", () => {
  assert.deepEqual(planBookingWrite({
    bookingUid: record.bookingUid,
    email: record.email,
    uidMatches: [],
    emailMatches: [],
  }), { action: "create", reason: "new_booking" })
})

test("deduplicates a webhook replay by booking UID", () => {
  assert.deepEqual(planBookingWrite({
    bookingUid: record.bookingUid,
    email: record.email,
    uidMatches: [record],
    emailMatches: [],
  }), {
    action: "update",
    recordId: record.id,
    reason: "booking_uid_replay",
  })
})

test("a recovered stale reservation binds a prior crash-window CRM write", () => {
  // The first operation may have created Notion and stopped before D1 commit.
  // After the conservative lease threshold, the recovered operation performs
  // this lookup again and must update that exact record rather than create.
  assert.deepEqual(planBookingWrite({
    bookingUid: record.bookingUid,
    email: record.email,
    uidMatches: [record],
    emailMatches: [],
  }), {
    action: "update",
    recordId: record.id,
    reason: "booking_uid_replay",
  })
})

test("claims a single canonical email record only when its booking UID is empty", () => {
  assert.deepEqual(planBookingWrite({
    bookingUid: record.bookingUid,
    email: record.email,
    uidMatches: [],
    emailMatches: [{ ...record, bookingUid: "" }],
  }), {
    action: "update",
    recordId: record.id,
    reason: "canonical_email_claim",
  })
})

test("fails closed for duplicate UID records and conflicting repeat bookings", () => {
  assert.throws(() => planBookingWrite({
    bookingUid: record.bookingUid,
    email: record.email,
    uidMatches: [record, { ...record, id: "canonical-record-2" }],
    emailMatches: [],
  }), (error) => error instanceof BookingContractError && error.code === "duplicate_booking_uid")

  assert.throws(() => planBookingWrite({
    bookingUid: "booking_uid_new",
    email: record.email,
    uidMatches: [],
    emailMatches: [record],
  }), (error) => error instanceof BookingContractError && error.code === "canonical_email_booking_conflict")
})

test("post-write verification requires exactly one matching canonical record", () => {
  assert.doesNotThrow(() => verifyBookingMapping([record], record.id))
  assert.throws(() => verifyBookingMapping([], record.id), BookingContractError)
  assert.throws(() => verifyBookingMapping([record, { ...record, id: "duplicate" }], record.id), BookingContractError)
})
