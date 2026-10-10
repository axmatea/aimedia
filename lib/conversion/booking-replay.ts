import type { StructuredBookingLead } from "./cal-webhook.ts"

export type PersistedBookingSnapshot = {
  bookingStatus: "" | StructuredBookingLead["bookingStatus"]
  bookedAt: string
  capturedAt: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm: string
  utmContent: string
  attributionRef: string
  metaCampaignId: string
  metaAdSetId: string
  metaAdId: string
  creativeLabel: string
  fbclid: string
  fbc: string
  fbp: string
  referrerHost: string
  landingPage: string
}

export function bookingReplayWriteMode(input: {
  incomingStatus: StructuredBookingLead["bookingStatus"]
  persistedStatus: PersistedBookingSnapshot["bookingStatus"]
  reservationCommitted: boolean
}) {
  if (
    input.incomingStatus === "Pending"
    && (input.reservationCommitted || input.persistedStatus === "Booked")
  ) return "READ_ONLY" as const
  if (input.reservationCommitted) return "IMMUTABLE_ATTRIBUTION" as const
  return "FULL" as const
}

function firstTouch(persisted: string, incoming: string) {
  return persisted || incoming
}

function hasTrustedMetaTuple(snapshot: PersistedBookingSnapshot) {
  return Boolean(
    snapshot.metaCampaignId
    && snapshot.metaAdSetId
    && snapshot.metaAdId
    && snapshot.creativeLabel,
  )
}

function incomingMatchesPersistedTuple(
  incoming: StructuredBookingLead,
  persisted: PersistedBookingSnapshot,
) {
  return incoming.metaCampaignId === persisted.metaCampaignId
    && incoming.metaAdSetId === persisted.metaAdSetId
    && incoming.metaAdId === persisted.metaAdId
    && incoming.creativeLabel === persisted.creativeLabel
}

/**
 * Cal can deliver retries out of order. The canonical record is monotonic:
 * Booked never regresses to Pending, and committed first-touch attribution is
 * never erased or rebound by a later delivery.
 */
export function mergeBookingReplay(
  incoming: StructuredBookingLead,
  persisted: PersistedBookingSnapshot | null,
  incomingMetaVerified: boolean,
  immutableAttribution = false,
): StructuredBookingLead {
  if (!persisted) return incoming

  const bookingStatus = persisted.bookingStatus === "Booked" || incoming.bookingStatus === "Booked"
    ? "Booked"
    : "Pending"
  const bookedAt = persisted.bookingStatus === "Booked"
    ? firstTouch(persisted.bookedAt, incoming.bookedAt)
    : incoming.bookingStatus === "Booked"
      ? incoming.bookedAt
      : firstTouch(persisted.bookedAt, incoming.bookedAt)
  const persistedTupleTrusted = hasTrustedMetaTuple(persisted)
  const sameVerifiedEpoch = persistedTupleTrusted
    && incomingMetaVerified
    && incomingMatchesPersistedTuple(incoming, persisted)
  const trustedTuple = persistedTupleTrusted
    ? {
        metaCampaignId: persisted.metaCampaignId,
        metaAdSetId: persisted.metaAdSetId,
        metaAdId: persisted.metaAdId,
        creativeLabel: persisted.creativeLabel,
      }
    : incomingMetaVerified && !immutableAttribution
      ? {
          metaCampaignId: incoming.metaCampaignId,
          metaAdSetId: incoming.metaAdSetId,
          metaAdId: incoming.metaAdId,
          creativeLabel: incoming.creativeLabel,
        }
      : {
          metaCampaignId: "",
          metaAdSetId: "",
          metaAdId: "",
          creativeLabel: "",
        }
  const boundIdentifiers = persistedTupleTrusted
    ? {
        fbclid: persisted.fbclid || (!immutableAttribution && sameVerifiedEpoch ? incoming.fbclid : ""),
        fbc: persisted.fbc || (!immutableAttribution && sameVerifiedEpoch ? incoming.fbc : ""),
        fbp: persisted.fbp || (!immutableAttribution && sameVerifiedEpoch ? incoming.fbp : ""),
      }
    : incomingMetaVerified && !immutableAttribution
      ? { fbclid: incoming.fbclid, fbc: incoming.fbc, fbp: incoming.fbp }
      : {
          fbclid: immutableAttribution
            ? persisted.fbclid
            : firstTouch(persisted.fbclid, incoming.fbclid),
          fbc: immutableAttribution ? persisted.fbc : firstTouch(persisted.fbc, incoming.fbc),
          fbp: immutableAttribution ? persisted.fbp : firstTouch(persisted.fbp, incoming.fbp),
        }

  return {
    ...incoming,
    bookingStatus,
    bookedAt,
    capturedAt: immutableAttribution
      ? persisted.capturedAt || incoming.capturedAt
      : firstTouch(persisted.capturedAt, incoming.capturedAt),
    utmSource: immutableAttribution
      ? persisted.utmSource
      : firstTouch(persisted.utmSource, incoming.utmSource),
    utmMedium: immutableAttribution
      ? persisted.utmMedium
      : firstTouch(persisted.utmMedium, incoming.utmMedium),
    utmCampaign: immutableAttribution
      ? persisted.utmCampaign
      : firstTouch(persisted.utmCampaign, incoming.utmCampaign),
    utmTerm: immutableAttribution
      ? persisted.utmTerm
      : firstTouch(persisted.utmTerm, incoming.utmTerm),
    utmContent: immutableAttribution
      ? persisted.utmContent
      : firstTouch(persisted.utmContent, incoming.utmContent),
    attributionRef: immutableAttribution
      ? persisted.attributionRef
      : firstTouch(persisted.attributionRef, incoming.attributionRef),
    ...trustedTuple,
    ...boundIdentifiers,
    referrerHost: immutableAttribution
      ? persisted.referrerHost
      : firstTouch(persisted.referrerHost, incoming.referrerHost),
    landingPage: immutableAttribution
      ? persisted.landingPage || "/"
      : firstTouch(persisted.landingPage, incoming.landingPage),
  }
}
