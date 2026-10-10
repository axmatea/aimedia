export type FunnelAttribution = {
  source: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm: string
  utmContent: string
  fbclid: string
  fbc: string
  fbp: string
  attributionRef: string
  metaCampaignId: string
  metaAdSetId: string
  metaAdId: string
  creativeLabel: string
  referrerHost: string
  landingPath: string
  capturedAt: string
}

const SESSION_KEY = "axmedia:funnel-attribution:v3"
const MAX_PARAM_LENGTH = 120
const ATTRIBUTION_REF = /^[A-Za-z0-9_-]{6,96}$/
const META_CLICK_ID = /^[A-Za-z0-9._~-]{8,512}$/
const META_BROWSER_ID = /^fb\.\d\.\d{10,16}\.[A-Za-z0-9._~-]{6,512}$/
const META_OBJECT_ID = /^\d{6,32}$/

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

function cookieValue(cookieHeader: string, name: string) {
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=")
    if (rawName !== name) continue
    try {
      return decodeURIComponent(rawValue.join("="))
    } catch {
      return rawValue.join("=")
    }
  }
  return ""
}

function metaClickId(value: string | null | undefined) {
  const normalized = clean(value, 512)
  return META_CLICK_ID.test(normalized) ? normalized : ""
}

function metaBrowserId(value: string | null | undefined) {
  const normalized = clean(value, 560)
  return META_BROWSER_ID.test(normalized) ? normalized : ""
}

function metaObjectId(value: string | null | undefined) {
  const normalized = clean(value, 32)
  return META_OBJECT_ID.test(normalized) ? normalized : ""
}

function derivedFbc(fbclid: string, capturedAt: string) {
  if (!fbclid) return ""
  const timestamp = Date.parse(capturedAt)
  if (!Number.isFinite(timestamp)) return ""
  return `fb.1.${Math.trunc(timestamp)}.${fbclid}`
}

export function attributionFromLocation(
  href: string,
  referrer = "",
  capturedAt = new Date().toISOString(),
  cookieHeader = "",
): FunnelAttribution {
  const url = new URL(href, "https://aimedia.global")
  const utmSource = clean(url.searchParams.get("utm_source"))
  const utmMedium = clean(url.searchParams.get("utm_medium"))
  const utmCampaign = clean(url.searchParams.get("utm_campaign"))
  const utmTerm = clean(url.searchParams.get("utm_term"))
  const utmContent = clean(url.searchParams.get("utm_content"))
  const rawRef = clean(url.searchParams.get("ax_ref"), 96)
  const attributionRef = ATTRIBUTION_REF.test(rawRef) ? rawRef : ""
  const metaAdId = metaObjectId(url.searchParams.get("meta_ad_id"))
    || metaObjectId(attributionRef)
  const metaAdSetId = metaObjectId(url.searchParams.get("meta_adset_id"))
  const metaCampaignId = metaObjectId(url.searchParams.get("meta_campaign_id"))
  const creativeLabel = clean(
    url.searchParams.get("meta_creative") || utmContent,
    120,
  )
  const fbclid = metaClickId(url.searchParams.get("fbclid"))
  // A current click must win over a stale _fbc cookie. We derive the standard
  // fbc value in-memory but do not set a new cookie or extend its lifetime.
  const fbc = derivedFbc(fbclid, capturedAt)
    || metaBrowserId(cookieValue(cookieHeader, "_fbc"))
  const fbp = metaBrowserId(cookieValue(cookieHeader, "_fbp"))
  const host = referrerHost(referrer)

  return {
    source: utmSource || (fbclid ? "meta" : host || "direct"),
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    fbclid,
    fbc,
    fbp,
    attributionRef,
    metaCampaignId,
    metaAdSetId,
    metaAdId,
    creativeLabel,
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
    && typeof candidate.fbclid === "string"
    && typeof candidate.fbc === "string"
    && typeof candidate.fbp === "string"
    && typeof candidate.metaCampaignId === "string"
    && typeof candidate.metaAdSetId === "string"
    && typeof candidate.metaAdId === "string"
    && typeof candidate.creativeLabel === "string"
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

  const attribution = attributionFromLocation(
    window.location.href,
    document.referrer,
    new Date().toISOString(),
    document.cookie,
  )
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
      ["metadata[fbclid]", attribution.fbclid],
      ["metadata[fbc]", attribution.fbc],
      ["metadata[fbp]", attribution.fbp],
      ["metadata[source]", attribution.source],
      ["metadata[landingPath]", attribution.landingPath],
      ["metadata[conversionAction]", "book_a_call"],
      ["metadata[capturedAt]", attribution.capturedAt],
      ["metadata[referrerHost]", attribution.referrerHost],
      ["metadata[attributionRef]", attribution.attributionRef],
      ["metadata[metaCampaignId]", attribution.metaCampaignId],
      ["metadata[metaAdSetId]", attribution.metaAdSetId],
      ["metadata[metaAdId]", attribution.metaAdId],
      ["metadata[creativeLabel]", attribution.creativeLabel],
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
    for (const key of [
      "ax_ref",
      "email",
      "name",
      "phone",
      "fbclid",
      "fbc",
      "fbp",
      "_fbc",
      "_fbp",
      "metadata[fbclid]",
      "metadata[fbc]",
      "metadata[fbp]",
    ]) url.searchParams.delete(key)
    return url.toString()
  } catch {
    return rawUrl
  }
}
