export type FunnelAttribution = {
  source: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm: string
  utmContent: string
  attributionRef: string
  referrerHost: string
  landingPath: string
  capturedAt: string
}

const SESSION_KEY = "axmedia:funnel-attribution:v1"
const MAX_PARAM_LENGTH = 120
const ATTRIBUTION_REF = /^[A-Za-z0-9_-]{6,96}$/

function clean(value: string | null | undefined, maxLength = MAX_PARAM_LENGTH) {
  return (value || "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
}

function referrerHost(referrer: string) {
  if (!referrer) return ""
  try {
    return clean(new URL(referrer).hostname.toLowerCase(), 100)
  } catch {
    return ""
  }
}

export function attributionFromLocation(
  href: string,
  referrer = "",
  capturedAt = new Date().toISOString(),
): FunnelAttribution {
  const url = new URL(href, "https://aimedia.global")
  const utmSource = clean(url.searchParams.get("utm_source"))
  const utmMedium = clean(url.searchParams.get("utm_medium"))
  const utmCampaign = clean(url.searchParams.get("utm_campaign"))
  const utmTerm = clean(url.searchParams.get("utm_term"))
  const utmContent = clean(url.searchParams.get("utm_content"))
  const rawRef = clean(url.searchParams.get("ax_ref"), 96)
  const attributionRef = ATTRIBUTION_REF.test(rawRef) ? rawRef : ""
  const host = referrerHost(referrer)

  return {
    source: utmSource || host || "direct",
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    attributionRef,
    referrerHost: host,
    landingPath: clean(`${url.pathname}${url.hash}`, 240) || "/",
    capturedAt: clean(capturedAt, 40),
  }
}

function validStoredAttribution(value: unknown): value is FunnelAttribution {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<FunnelAttribution>
  return typeof candidate.source === "string"
    && typeof candidate.landingPath === "string"
    && typeof candidate.capturedAt === "string"
}

export function captureAttribution(): FunnelAttribution {
  if (typeof window === "undefined") {
    return attributionFromLocation("https://aimedia.global/")
  }

  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as unknown
      if (validStoredAttribution(parsed)) return parsed
    }
  } catch {
    // Storage can be disabled. Attribution still works for the current page.
  }

  const attribution = attributionFromLocation(window.location.href, document.referrer)
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(attribution))
  } catch {
    // Keep the in-memory result when storage is unavailable.
  }
  return attribution
}

export function analyticsAttribution(attribution: FunnelAttribution) {
  return {
    source: attribution.source,
    campaign: attribution.utmCampaign || "none",
  }
}

export function calAttributionConfig(attribution: FunnelAttribution) {
  return Object.fromEntries(
    [
      ["utm_source", attribution.utmSource],
      ["utm_medium", attribution.utmMedium],
      ["utm_campaign", attribution.utmCampaign],
      ["utm_term", attribution.utmTerm],
      ["utm_content", attribution.utmContent],
      ["metadata[source]", attribution.source],
      ["metadata[landingPath]", attribution.landingPath],
      ["metadata[conversionAction]", "book_a_call"],
      ["metadata[capturedAt]", attribution.capturedAt],
      ["metadata[referrerHost]", attribution.referrerHost],
      ["metadata[attributionRef]", attribution.attributionRef],
      ["metadata[utmSource]", attribution.utmSource],
      ["metadata[utmMedium]", attribution.utmMedium],
      ["metadata[utmCampaign]", attribution.utmCampaign],
      ["metadata[utmTerm]", attribution.utmTerm],
      ["metadata[utmContent]", attribution.utmContent],
    ].filter((entry): entry is [string, string] => Boolean(entry[1])),
  )
}

export function attributedCalUrl(baseUrl: string, attribution: FunnelAttribution) {
  const url = new URL(baseUrl)
  for (const [key, value] of Object.entries(calAttributionConfig(attribution))) {
    url.searchParams.set(key, value)
  }
  url.searchParams.set("duration", "30")
  return url.toString()
}

export function redactAnalyticsUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl, "https://aimedia.global")
    for (const key of ["ax_ref", "email", "name", "phone"]) url.searchParams.delete(key)
    return url.toString()
  } catch {
    return rawUrl
  }
}
