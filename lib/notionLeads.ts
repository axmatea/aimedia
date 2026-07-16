// Shared helpers for the Inbound Leads: AI Media Notion DB.
// Source of truth: every booking-related route + every Resend webhook routes through here.

const NOTION_DB_ID = "316e953489014e0ebd499995e418d211"
const NOTION_VERSION = "2022-06-28"

function notionToken(): string {
  const t = process.env.NOTION_TOKEN
  if (!t) throw new Error("NOTION_TOKEN is not configured")
  return t
}

export type NotionLead = {
  id: string
  scheduledEmailIds: string[]
  followUpStatus: string | null
}

function parseLead(page: { id: string; properties: Record<string, unknown> }): NotionLead {
  const props = page.properties as Record<string, {
    rich_text?: Array<{ plain_text?: string }>
    select?: { name?: string } | null
  }>
  const idsRaw = props["Scheduled Emails"]?.rich_text?.[0]?.plain_text || ""
  const scheduledEmailIds = idsRaw.split(",").map((s) => s.trim()).filter(Boolean)
  const followUpStatus = props["Follow-up Status"]?.select?.name || null
  return { id: page.id, scheduledEmailIds, followUpStatus }
}

export async function findLeadByEmail(email: string): Promise<NotionLead | null> {
  const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken()}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({
      filter: { property: "Email", email: { equals: email } },
      sorts: [{ timestamp: "created_time", direction: "descending" }],
      page_size: 1,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Notion query ${res.status}: ${text.slice(0, 200)}`)
  }
  const json = (await res.json()) as { results?: Array<{ id: string; properties: Record<string, unknown> }> }
  const first = json.results?.[0]
  return first ? parseLead(first) : null
}

export async function findLeadByEmailId(emailId: string): Promise<NotionLead | null> {
  // Match the email ID inside the comma-separated "Scheduled Emails" rich_text.
  const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken()}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({
      filter: { property: "Scheduled Emails", rich_text: { contains: emailId } },
      page_size: 1,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Notion query (by email id) ${res.status}: ${text.slice(0, 200)}`)
  }
  const json = (await res.json()) as { results?: Array<{ id: string; properties: Record<string, unknown> }> }
  const first = json.results?.[0]
  return first ? parseLead(first) : null
}

type PatchProps = Record<string, unknown>

async function patchPage(pageId: string, properties: PatchProps): Promise<void> {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${notionToken()}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({ properties }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Notion patch ${res.status}: ${text.slice(0, 200)}`)
  }
}

export async function markFollowUpStatus(
  pageId: string,
  status: "Scheduled" | "Canceled" | "Completed" | "Failed"
): Promise<void> {
  await patchPage(pageId, {
    "Follow-up Status": { select: { name: status } },
  })
}

export async function markContacted(pageId: string): Promise<void> {
  await patchPage(pageId, {
    Status: { select: { name: "Contacted" } },
    "Follow-up Status": { select: { name: "Canceled" } },
    "Contacted At": { date: { start: new Date().toISOString() } },
  })
}

export async function markEngagement(
  pageId: string,
  kind: "opened" | "clicked",
  at: string
): Promise<void> {
  const propName = kind === "opened" ? "Last Opened" : "Last Clicked"
  await patchPage(pageId, {
    [propName]: { date: { start: at } },
  })
}

export async function markBounced(pageId: string): Promise<void> {
  await patchPage(pageId, {
    Bounced: { checkbox: true },
    "Follow-up Status": { select: { name: "Failed" } },
  })
}

export async function markComplained(pageId: string): Promise<void> {
  await patchPage(pageId, {
    Complained: { checkbox: true },
    "Follow-up Status": { select: { name: "Canceled" } },
  })
}
