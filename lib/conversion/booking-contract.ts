export type CanonicalBookingRecord = {
  id: string
  bookingUid: string
  email: string
}

export type BookingWritePlan =
  | { action: "create"; reason: "new_booking" }
  | {
      action: "update"
      recordId: string
      reason: "booking_uid_replay" | "canonical_email_claim"
    }

export type BookingContractErrorCode =
  | "duplicate_booking_uid"
  | "duplicate_canonical_email"
  | "booking_uid_email_conflict"
  | "canonical_email_booking_conflict"
  | "booking_mapping_unverified"

export class BookingContractError extends Error {
  readonly code: BookingContractErrorCode

  constructor(code: BookingContractErrorCode) {
    super(code)
    this.name = "BookingContractError"
    this.code = code
  }
}

export function planBookingWrite(input: {
  bookingUid: string
  email: string
  uidMatches: CanonicalBookingRecord[]
  emailMatches: CanonicalBookingRecord[]
}): BookingWritePlan {
  if (input.uidMatches.length > 1) {
    throw new BookingContractError("duplicate_booking_uid")
  }

  const uidMatch = input.uidMatches[0]
  if (uidMatch) {
    if (uidMatch.email.toLowerCase() !== input.email.toLowerCase()) {
      throw new BookingContractError("booking_uid_email_conflict")
    }
    return {
      action: "update",
      recordId: uidMatch.id,
      reason: "booking_uid_replay",
    }
  }

  if (input.emailMatches.length > 1) {
    throw new BookingContractError("duplicate_canonical_email")
  }

  const emailMatch = input.emailMatches[0]
  if (!emailMatch) return { action: "create", reason: "new_booking" }
  if (emailMatch.bookingUid && emailMatch.bookingUid !== input.bookingUid) {
    throw new BookingContractError("canonical_email_booking_conflict")
  }

  return {
    action: "update",
    recordId: emailMatch.id,
    reason: "canonical_email_claim",
  }
}

export function verifyBookingMapping(
  matches: CanonicalBookingRecord[],
  expectedRecordId: string,
) {
  if (matches.length !== 1 || matches[0]?.id !== expectedRecordId) {
    throw new BookingContractError("booking_mapping_unverified")
  }
}
