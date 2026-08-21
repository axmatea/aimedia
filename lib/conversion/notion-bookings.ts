import "server-only"

import type { StructuredBookingLead } from "@/lib/conversion/cal-webhook"

const DEFAULT_DB_ID = "316e953489014e0ebd499995e418d211"
const NOTION_VERSION = "2022-06-28"

type PropertyDefinition = { type?: string }
type PageRecord = { id: string }

function notionConfig() {
  const token = process.env.NOTION_TOKEN?.trim()
  if (!token) throw new Error("NOTION_TOKEN is not configured")
  return {
    token,
    databaseId: process.env.NOTION_LEADS_DB_ID?.trim() || DEFAULT_DB_ID,
  }
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  }
}

async function databaseProperties(token: string, databaseId: string) {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: headers(token),
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`Notion schema unavailable (${response.status})`)
  const body = await response.json() as { properties?: Record<string, PropertyDefinition> }
  return body.properties || {}
}

async function findExistingLead(token: string, databaseId: string, email: string) {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      filter: { property: "Email", email: { equals: email } },
      sorts: [{ timestamp: "created_time", direction: "descending" }],
      page_size: 1,
    }),
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`Notion lead lookup failed (${response.status})`)
  const body = await response.json() as { results?: PageRecord[] }
  return body.results?.[0] || null
}

function richText(content: string) {
  return { rich_text: content ? [{ text: { content: content.slice(0, 1900) } }] : [] }
}

function goalSummary(lead: StructuredBookingLead) {
  return [
    `Context status: ${lead.contextStatus}`,
    lead.company && `Company: ${lead.company}`,
    lead.projectContext && `Project context: ${lead.projectContext}`,
    `Booking: ${lead.bookingStatus} · ${lead.startTime}`,
    `Attribution: ${lead.source} · ${lead.utmCampaign || "no campaign"} · ${lead.landingPage}`,
  ].filter(Boolean).join("\n").slice(0, 1900)
}

function buildProperties(
  schema: Record<string, PropertyDefinition>,
  lead: StructuredBookingLead,
) {
  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: lead.name.slice(0, 200) } }] },
    Email: { email: lead.email },
    Phone: { phone_number: lead.phone || null },
    "Project Type": richText("Strategy Call"),
    Goal: richText(goalSummary(lead)),
    Status: { select: { name: lead.qualified ? "Qualified" : "New" } },
    Source: { select: { name: "Website" } },
  }

  const optional: Record<string, unknown> = {
    Company: richText(lead.company),
    "UTM Source": richText(lead.utmSource),
    "UTM Medium": richText(lead.utmMedium),
    "UTM Campaign": richText(lead.utmCampaign),
    "UTM Term": richText(lead.utmTerm),
    "UTM Content": richText(lead.utmContent),
    "Attribution Ref": richText(lead.attributionRef),
    "Landing Page": { url: `https://aimedia.global${lead.landingPage}` },
    "Conversion Action": { select: { name: "Book a Call" } },
    "Booking UID": richText(lead.bookingUid),
    "Booking Status": { select: { name: lead.bookingStatus } },
    "Context Status": { select: { name: lead.contextStatus } },
    "Booked At": { date: { start: lead.bookedAt } },
  }
  for (const [name, value] of Object.entries(optional)) {
    if (schema[name]) properties[name] = value
  }
  return properties
}

export async function upsertBookingLead(lead: StructuredBookingLead) {
  const { token, databaseId } = notionConfig()
  const [schema, existing] = await Promise.all([
    databaseProperties(token, databaseId),
    findExistingLead(token, databaseId, lead.email),
  ])
  const properties = buildProperties(schema, lead)
  const response = existing
    ? await fetch(`https://api.notion.com/v1/pages/${existing.id}`, {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify({ properties }),
      })
    : await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
      })

  if (!response.ok) throw new Error(`Notion lead write failed (${response.status})`)
  const page = await response.json() as PageRecord
  return {
    leadId: page.id,
    created: !existing,
    qualified: lead.qualified,
    structuredFields: [
      "Company",
      "UTM Source",
      "UTM Medium",
      "UTM Campaign",
      "Landing Page",
      "Conversion Action",
      "Booking UID",
      "Booking Status",
      "Context Status",
      "Booked At",
    ].filter((name) => Boolean(schema[name])),
  }
}
