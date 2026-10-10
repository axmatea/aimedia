import "server-only"
import type { BookingDeadline } from "./booking-deadline.ts"

import crypto from "node:crypto"
import type { StructuredBookingLead } from "@/lib/conversion/cal-webhook"
import {
  BookingContractError,
  planBookingWrite,
  verifyBookingMapping,
  type CanonicalBookingRecord,
} from "@/lib/conversion/booking-contract"
import {
  metaLeadEventId,
  planMetaLeadDelivery,
} from "@/lib/conversion/meta-capi-contract"
import {
  withBookingMutationLock,
  type BookingReservation,
} from "@/lib/conversion/booking-lock"
import {
  bookingReplayWriteMode,
  mergeBookingReplay,
  type PersistedBookingSnapshot,
} from "@/lib/conversion/booking-replay"
import {
  verifyMetaAttribution,
  type MetaAttributionVerification,
} from "@/lib/conversion/meta-attribution-allowlist"

const NOTION_VERSION = "2022-06-28"

type PropertyDefinition = { type?: string }
type PropertyValue = {
  email?: string | null
  rich_text?: Array<{ plain_text?: string; text?: { content?: string } }>
  date?: { start?: string | null } | null
  select?: { name?: string | null } | null
  url?: string | null
}
type PageRecord = {
  id: string
  properties?: Record<string, PropertyValue>
}

const REQUIRED_BOOKING_SCHEMA: Record<string, string> = {
  Name: "title",
  Email: "email",
  Company: "rich_text",
  Website: "url",
  "Business Type": "select",
  "Buyer Role": "select",
  Problem: "rich_text",
  "Service Needed": "rich_text",
  "Budget Band": "select",
  Timeline: "select",
  "Preferred Contact": "select",
  "Qualification Status": "select",
  "Qualification Reasons": "rich_text",
  Source: "select",
  "Booking UID": "rich_text",
  "UTM Source": "rich_text",
  "UTM Medium": "rich_text",
  "UTM Campaign": "rich_text",
  "UTM Term": "rich_text",
  "UTM Content": "rich_text",
  "Attribution Ref": "rich_text",
  "Meta Campaign ID": "rich_text",
  "Meta Ad Set ID": "rich_text",
  "Meta Ad ID": "rich_text",
  "Creative Label": "rich_text",
  "Meta FBCLID": "rich_text",
  "Meta FBC": "rich_text",
  "Meta FBP": "rich_text",
  "Referrer Host": "rich_text",
  "Landing Page": "url",
  "Conversion Action": "select",
  "Booking Status": "select",
  "Context Status": "select",
  "Captured At": "date",
  "Booked At": "date",
  "Meta Lead Event ID": "rich_text",
  "Meta Lead Sent At": "date",
}

function notionConfig() {
  const token = process.env.NOTION_TOKEN?.trim()
  const databaseId = process.env.NOTION_LEADS_DB_ID?.trim()
  if (!token) throw new Error("NOTION_TOKEN is not configured")
  if (!databaseId) throw new Error("NOTION_LEADS_DB_ID is not configured")
  return { token, databaseId }
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  }
}

async function databaseProperties(token: string, databaseId: string, deadline: BookingDeadline) {
  const response = await deadline.fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: headers(token),
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`Notion schema unavailable (${response.status})`)
  const body = await deadline.json(response) as { properties?: Record<string, PropertyDefinition> }
  return body.properties || {}
}

function assertRequiredSchema(schema: Record<string, PropertyDefinition>) {
  const invalid = Object.entries(REQUIRED_BOOKING_SCHEMA)
    .filter(([name, type]) => schema[name]?.type !== type)
    .map(([name, type]) => `${name}:${type}`)
  if (invalid.length) {
    throw new Error(`Notion booking schema is incomplete (${invalid.join(", ")})`)
  }
}

async function queryLeads(
  token: string,
  databaseId: string,
  filter: Record<string, unknown>,
  deadline: BookingDeadline,
) {
  const response = await deadline.fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ filter, page_size: 2 }),
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`Notion lead lookup failed (${response.status})`)
  const body = await deadline.json(response) as { results?: PageRecord[] }
  return body.results || []
}

function richTextValue(property: PropertyValue | undefined) {
  return (property?.rich_text || [])
    .map((item) => item.plain_text || item.text?.content || "")
    .join("")
    .trim()
}

type PersistedBookingRecord = CanonicalBookingRecord & {
  metaLeadEventId: string
  metaLeadSentAt: string
} & PersistedBookingSnapshot

function dateValue(property: PropertyValue | undefined) {
  return property?.date?.start?.trim() || ""
}

function selectValue(property: PropertyValue | undefined) {
  return property?.select?.name?.trim() || ""
}

function urlValue(property: PropertyValue | undefined) {
  return property?.url?.trim() || ""
}

function persistedLandingPath(property: PropertyValue | undefined) {
  const value = urlValue(property)
  if (!value) return ""
  try {
    const url = new URL(value)
    if (url.origin !== "https://aimedia.global") return ""
    return `${url.pathname}${url.search}`
  } catch {
    return ""
  }
}

function canonicalRecord(page: PageRecord): PersistedBookingRecord {
  return {
    id: page.id,
    bookingUid: richTextValue(page.properties?.["Booking UID"]),
    email: (page.properties?.Email?.email || "").trim().toLowerCase(),
    metaLeadEventId: richTextValue(page.properties?.["Meta Lead Event ID"]),
    metaLeadSentAt: dateValue(page.properties?.["Meta Lead Sent At"]),
    bookingStatus: selectValue(page.properties?.["Booking Status"]) === "Booked"
      ? "Booked"
      : selectValue(page.properties?.["Booking Status"]) === "Pending"
        ? "Pending"
        : "",
    bookedAt: dateValue(page.properties?.["Booked At"]),
    capturedAt: dateValue(page.properties?.["Captured At"]),
    utmSource: richTextValue(page.properties?.["UTM Source"]),
    utmMedium: richTextValue(page.properties?.["UTM Medium"]),
    utmCampaign: richTextValue(page.properties?.["UTM Campaign"]),
    utmTerm: richTextValue(page.properties?.["UTM Term"]),
    utmContent: richTextValue(page.properties?.["UTM Content"]),
    attributionRef: richTextValue(page.properties?.["Attribution Ref"]),
    metaCampaignId: richTextValue(page.properties?.["Meta Campaign ID"]),
    metaAdSetId: richTextValue(page.properties?.["Meta Ad Set ID"]),
    metaAdId: richTextValue(page.properties?.["Meta Ad ID"]),
    creativeLabel: richTextValue(page.properties?.["Creative Label"]),
    fbclid: richTextValue(page.properties?.["Meta FBCLID"]),
    fbc: richTextValue(page.properties?.["Meta FBC"]),
    fbp: richTextValue(page.properties?.["Meta FBP"]),
    referrerHost: richTextValue(page.properties?.["Referrer Host"]),
    landingPage: persistedLandingPath(page.properties?.["Landing Page"]),
  }
}

async function readPageById(token: string, pageId: string, deadline: BookingDeadline) {
  const response = await deadline.fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: headers(token),
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`Notion page readback failed (${response.status})`)
  return deadline.json<PageRecord>(response)
}

async function findByBookingUid(token: string, databaseId: string, bookingUid: string, deadline: BookingDeadline) {
  const pages = await queryLeads(token, databaseId, {
    property: "Booking UID",
    rich_text: { equals: bookingUid },
  }, deadline)
  return pages.map(canonicalRecord)
}

async function findByEmail(token: string, databaseId: string, email: string, deadline: BookingDeadline) {
  const pages = await queryLeads(token, databaseId, {
    property: "Email",
    email: { equals: email },
  }, deadline)
  return pages.map(canonicalRecord)
}

function richText(content: string) {
  return { rich_text: content ? [{ text: { content: content.slice(0, 1900) } }] : [] }
}

function goalSummary(lead: StructuredBookingLead) {
  return [
    `Qualification: ${lead.qualificationStatus}`,
    lead.company && `Company: ${lead.company}`,
    lead.problem && `Bottleneck: ${lead.problem}`,
    lead.serviceNeeded && `Service: ${lead.serviceNeeded}`,
    `Booking: ${lead.bookingStatus} · ${lead.startTime}`,
    `Attribution: ${lead.source} · ${lead.utmCampaign || "no campaign"} · ${lead.landingPage}`,
  ].filter(Boolean).join("\n").slice(0, 1900)
}

function buildProperties(
  schema: Record<string, PropertyDefinition>,
  lead: StructuredBookingLead,
  storedMetaLeadEventId: string,
  verifiedMetaAttribution: boolean,
) {
  const bookingEventId = lead.bookingStatus === "Booked" && verifiedMetaAttribution
    ? metaLeadEventId(lead.bookingUid)
    : storedMetaLeadEventId
  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: lead.name.slice(0, 200) } }] },
    Email: { email: lead.email },
    Company: richText(lead.company),
    Website: { url: lead.website || null },
    "Business Type": { select: lead.businessType ? { name: lead.businessType } : null },
    "Buyer Role": { select: lead.buyerRole ? { name: lead.buyerRole } : null },
    Problem: richText(lead.problem),
    "Service Needed": richText(lead.serviceNeeded),
    "Budget Band": { select: lead.budgetBand ? { name: lead.budgetBand } : null },
    Timeline: { select: lead.timeline ? { name: lead.timeline } : null },
    "Preferred Contact": { select: lead.preferredContact ? { name: lead.preferredContact } : null },
    "Qualification Status": { select: { name: lead.qualificationStatus } },
    "Qualification Reasons": richText(lead.qualificationReasons.join(", ")),
    Phone: { phone_number: lead.phone || null },
    "Project Type": richText("Strategy Call"),
    Goal: richText(goalSummary(lead)),
    Status: {
      select: {
        name: lead.qualified ? "Qualified" : lead.qualificationStatus === "NOT_ICP" ? "Not ICP" : "New",
      },
    },
    Source: { select: { name: "Website" } },
    "UTM Source": richText(lead.utmSource),
    "UTM Medium": richText(lead.utmMedium),
    "UTM Campaign": richText(lead.utmCampaign),
    "UTM Term": richText(lead.utmTerm),
    "UTM Content": richText(lead.utmContent),
    "Attribution Ref": richText(lead.attributionRef),
    "Meta Campaign ID": richText(verifiedMetaAttribution ? lead.metaCampaignId : ""),
    "Meta Ad Set ID": richText(verifiedMetaAttribution ? lead.metaAdSetId : ""),
    "Meta Ad ID": richText(verifiedMetaAttribution ? lead.metaAdId : ""),
    "Creative Label": richText(verifiedMetaAttribution ? lead.creativeLabel : ""),
    "Meta FBCLID": richText(lead.fbclid),
    "Meta FBC": richText(lead.fbc),
    "Meta FBP": richText(lead.fbp),
    "Referrer Host": richText(lead.referrerHost),
    "Landing Page": { url: `https://aimedia.global${lead.landingPage}` },
    "Conversion Action": { select: { name: "Book a Call" } },
    "Booking UID": richText(lead.bookingUid),
    "Booking Status": { select: { name: lead.bookingStatus } },
    "Context Status": { select: { name: lead.contextStatus } },
    "Captured At": { date: { start: lead.capturedAt } },
    "Booked At": { date: { start: lead.bookedAt } },
    "Meta Lead Event ID": richText(bookingEventId),
  }

  // These presentation fields predate the strict booking attribution contract
  // and remain optional. All attribution fields above are required and checked.
  for (const name of ["Phone", "Project Type", "Goal", "Status"]) {
    if (!schema[name]) delete properties[name]
  }
  return properties
}

const IMMUTABLE_ATTRIBUTION_PROPERTIES = new Set([
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "UTM Term",
  "UTM Content",
  "Attribution Ref",
  "Meta Campaign ID",
  "Meta Ad Set ID",
  "Meta Ad ID",
  "Creative Label",
  "Meta FBCLID",
  "Meta FBC",
  "Meta FBP",
  "Referrer Host",
  "Landing Page",
  "Captured At",
])

function withoutImmutableAttribution(properties: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(properties).filter(([name]) => !IMMUTABLE_ATTRIBUTION_PROPERTIES.has(name)),
  )
}

function digest(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16)
}

async function verifyPersistedMapping(
  token: string,
  bookingUid: string,
  email: string,
  expectedRecordId: string,
  deadline: BookingDeadline,
) {
  for (const delay of [0, 150, 350]) {
    if (delay) await deadline.delay(delay)
    try {
      const record = canonicalRecord(await readPageById(token, expectedRecordId, deadline))
      verifyBookingMapping([record], expectedRecordId)
      if (
        record.bookingUid !== bookingUid
        || record.email !== email.trim().toLowerCase()
      ) {
        throw new BookingContractError("booking_mapping_unverified")
      }
      return record
    } catch (error) {
      deadline.check()
      if (delay === 350) throw error
    }
  }
}

async function upsertBookingLeadUnlocked(
  lead: StructuredBookingLead,
  incomingMetaAttribution: MetaAttributionVerification,
  reservation: BookingReservation,
  deadline: BookingDeadline,
) {
  const { token, databaseId } = notionConfig()
  const schema = await databaseProperties(token, databaseId, deadline)
  assertRequiredSchema(schema)

  const uidMatches = await findByBookingUid(token, databaseId, lead.bookingUid, deadline)
  const emailMatches = uidMatches.length === 0
    ? await findByEmail(token, databaseId, lead.email, deadline)
    : []
  const plan = planBookingWrite({
    bookingUid: lead.bookingUid,
    email: lead.email,
    uidMatches,
    emailMatches,
  })
  if (reservation.mode === "committed") {
    if (plan.action === "create" || digest(plan.recordId) !== reservation.canonicalRef) {
      throw new BookingContractError("booking_mapping_unverified")
    }
  }
  const existing = uidMatches[0] || emailMatches[0]
  const replayWriteMode = bookingReplayWriteMode({
    incomingStatus: lead.bookingStatus,
    persistedStatus: existing?.bookingStatus || "",
    reservationCommitted: reservation.mode === "committed",
  })
  // A READ_ONLY delivery cannot supply conversion provenance. This also covers
  // stale-lock recovery after a prior Notion write succeeded but the D1 commit
  // did not: attribution and CAPI eligibility must come from the canonical CRM
  // snapshot, never from fields that this request will not persist.
  const effectiveLead = mergeBookingReplay(
    lead,
    existing || null,
    incomingMetaAttribution.verified,
    reservation.mode === "committed" || replayWriteMode === "READ_ONLY",
  )
  const effectiveMetaAttribution = verifyMetaAttribution(effectiveLead)
  const metaLeadDelivery = planMetaLeadDelivery({
    bookingUid: effectiveLead.bookingUid,
    bookingStatus: effectiveLead.bookingStatus,
    metaAttributed: effectiveMetaAttribution.verified,
    storedEventId: existing?.metaLeadEventId || "",
    storedSentAt: existing?.metaLeadSentAt || "",
  })
  const builtProperties = buildProperties(
    schema,
    effectiveLead,
    existing?.metaLeadEventId || "",
    effectiveMetaAttribution.verified,
  )
  // Attribution provenance becomes immutable when D1 commits the canonical
  // mapping. A stale Pending replay is read-only. A Booked replay may advance
  // profile/status fields but cannot PATCH any first-touch or Meta identifier,
  // eliminating cross-epoch Notion races without relying on query timing.
  const properties = replayWriteMode === "IMMUTABLE_ATTRIBUTION"
    ? withoutImmutableAttribution(builtProperties)
    : builtProperties
  let page: PageRecord
  if (replayWriteMode === "READ_ONLY") {
    if (plan.action !== "update") {
      throw new BookingContractError("booking_mapping_unverified")
    }
    page = await readPageById(token, plan.recordId, deadline)
  } else {
    const response = plan.action === "update"
      ? await deadline.fetch(`https://api.notion.com/v1/pages/${plan.recordId}`, {
          method: "PATCH",
          headers: headers(token),
          body: JSON.stringify({ properties }),
        })
      : await deadline.fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: headers(token),
          body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
        })

    if (!response.ok) throw new Error(`Notion lead write failed (${response.status})`)
    page = await deadline.json(response) as PageRecord
  }
  if (!page.id) throw new Error("Notion lead write returned no page id")
  await verifyPersistedMapping(token, effectiveLead.bookingUid, effectiveLead.email, page.id, deadline)

  const created = plan.action === "create"
  const deduplicated = plan.action === "update" && plan.reason === "booking_uid_replay"
  return {
    created,
    deduplicated,
    firstMapped: !deduplicated,
    qualified: lead.qualified,
    bookingRef: digest(lead.bookingUid),
    canonicalRef: digest(page.id),
    recordId: page.id,
    metaLeadDelivery,
    deliveryLead: effectiveLead,
    metaAttribution: effectiveMetaAttribution,
    structuredFields: Object.keys(REQUIRED_BOOKING_SCHEMA),
  }
}

export async function upsertBookingLead(
  lead: StructuredBookingLead,
  incomingMetaAttribution: MetaAttributionVerification,
  deadline: BookingDeadline,
) {
  return withBookingMutationLock(
    { bookingUid: lead.bookingUid, email: lead.email },
    (reservation) => upsertBookingLeadUnlocked(
      lead,
      incomingMetaAttribution,
      reservation,
      deadline,
    ),
    deadline,
  )
}

export async function markMetaLeadSent(input: {
  recordId: string
  bookingUid: string
  eventId: string
  sentAt?: string
}, deadline: BookingDeadline) {
  const { token } = notionConfig()
  const expectedEventId = metaLeadEventId(input.bookingUid)
  if (input.eventId !== expectedEventId) {
    throw new Error("Meta Lead event id does not match the booking contract")
  }
  const sentAt = input.sentAt || new Date().toISOString()
  const response = await deadline.fetch(`https://api.notion.com/v1/pages/${input.recordId}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify({
      properties: {
        "Meta Lead Event ID": richText(input.eventId),
        "Meta Lead Sent At": { date: { start: sentAt } },
      },
    }),
  })
  if (!response.ok) throw new Error(`Notion Meta Lead marker failed (${response.status})`)

  for (const delay of [0, 150, 350]) {
    if (delay) await deadline.delay(delay)
    try {
      const record = canonicalRecord(await readPageById(token, input.recordId, deadline))
      verifyBookingMapping([record], input.recordId)
      if (record.bookingUid !== input.bookingUid) {
        throw new BookingContractError("booking_mapping_unverified")
      }
      if (record?.metaLeadEventId === input.eventId && record.metaLeadSentAt) {
        return { eventId: input.eventId, sentAt: record.metaLeadSentAt }
      }
    } catch (error) {
      deadline.check()
      if (delay === 350) throw error
    }
  }
  throw new Error("Meta Lead marker readback failed")
}
