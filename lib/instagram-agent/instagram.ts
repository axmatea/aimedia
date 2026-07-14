// Instagram Graph API client: publishing and Direct messages.
//
// Requires an Instagram Business/Creator account linked to a Facebook Page,
// a Meta app, and a long-lived access token with instagram_content_publish +
// instagram_manage_messages permissions. See docs/instagram-agent.md.

const GRAPH_VERSION = process.env.GRAPH_API_VERSION || "v23.0"

function graphBase(): string {
  return `https://graph.facebook.com/${GRAPH_VERSION}`
}

function igUserId(): string {
  const id = process.env.IG_USER_ID
  if (!id) throw new Error("IG_USER_ID is not configured")
  return id
}

function accessToken(): string {
  const token = process.env.IG_ACCESS_TOKEN
  if (!token) throw new Error("IG_ACCESS_TOKEN is not configured")
  return token
}

async function graphPost(
  path: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(`${graphBase()}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: accessToken() }),
  })
  const data = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    throw new Error(`Graph API ${path} failed: ${res.status} ${JSON.stringify(data)}`)
  }
  return data
}

// Publish a single-image post. Two-step: create a media container, then
// publish it. imageUrl must be publicly reachable (Meta fetches it).
export async function publishImagePost(
  imageUrl: string,
  caption: string
): Promise<string> {
  const container = await graphPost(`${igUserId()}/media`, {
    image_url: imageUrl,
    caption,
  })
  const creationId = container.id as string
  if (!creationId) throw new Error("No container id returned by Graph API")

  const published = await graphPost(`${igUserId()}/media_publish`, {
    creation_id: creationId,
  })
  const mediaId = published.id as string
  if (!mediaId) throw new Error("No media id returned by media_publish")
  return mediaId
}

// Reply to a Direct message. Allowed within 24h of the user's last message
// (the "human agent" window rules are enforced by Meta server-side).
export async function sendDm(recipientId: string, text: string): Promise<void> {
  await graphPost(`${igUserId()}/messages`, {
    recipient: { id: recipientId },
    message: { text },
  })
}
