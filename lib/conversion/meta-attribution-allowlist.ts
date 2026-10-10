import type { StructuredBookingLead } from "./cal-webhook.ts"
import { isMetaAttributedLead } from "./meta-capi-contract.ts"

const META_OBJECT_ID = /^\d{6,32}$/
const CREATIVE_LABEL = /^[A-Za-z0-9][A-Za-z0-9 _.-]{1,119}$/

export type MetaAttributionMapping = {
  campaignId: string
  adSetId: string
  adId: string
  creativeLabel: string
}

export type MetaAttributionVerification =
  | { status: "NOT_META"; verified: false; reason: "no_meta_signal" }
  | {
      status: "UNVERIFIED"
      verified: false
      reason: "exact_mapping_not_found"
    }
  | { status: "VERIFIED"; verified: true; mapping: MetaAttributionMapping }

export class MetaAttributionConfigError extends Error {
  readonly code: "meta_allowlist_missing" | "meta_allowlist_invalid"

  constructor(code: MetaAttributionConfigError["code"]) {
    super(code)
    this.name = "MetaAttributionConfigError"
    this.code = code
  }
}

export function parseMetaAttributionAllowlist(raw: string): MetaAttributionMapping[] {
  if (!raw.trim()) throw new MetaAttributionConfigError("meta_allowlist_missing")
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new MetaAttributionConfigError("meta_allowlist_invalid")
  }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 100) {
    throw new MetaAttributionConfigError("meta_allowlist_invalid")
  }

  const mappings: MetaAttributionMapping[] = []
  const adIds = new Set<string>()
  for (const value of parsed) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new MetaAttributionConfigError("meta_allowlist_invalid")
    }
    const candidate = value as Record<string, unknown>
    const mapping = {
      campaignId: typeof candidate.campaignId === "string" ? candidate.campaignId.trim() : "",
      adSetId: typeof candidate.adSetId === "string" ? candidate.adSetId.trim() : "",
      adId: typeof candidate.adId === "string" ? candidate.adId.trim() : "",
      creativeLabel: typeof candidate.creativeLabel === "string" ? candidate.creativeLabel.trim() : "",
    }
    if (
      !META_OBJECT_ID.test(mapping.campaignId)
      || !META_OBJECT_ID.test(mapping.adSetId)
      || !META_OBJECT_ID.test(mapping.adId)
      || !CREATIVE_LABEL.test(mapping.creativeLabel)
      || adIds.has(mapping.adId)
    ) {
      throw new MetaAttributionConfigError("meta_allowlist_invalid")
    }
    adIds.add(mapping.adId)
    mappings.push(mapping)
  }
  return mappings
}

export function verifyMetaAttribution(
  lead: StructuredBookingLead,
  rawAllowlist = process.env.META_ATTRIBUTION_ALLOWLIST_JSON || "",
): MetaAttributionVerification {
  if (!isMetaAttributedLead(lead)) {
    return { status: "NOT_META", verified: false, reason: "no_meta_signal" }
  }
  const allowlist = parseMetaAttributionAllowlist(rawAllowlist)
  const mapping = allowlist.find((entry) => (
    entry.campaignId === lead.metaCampaignId
    && entry.adSetId === lead.metaAdSetId
    && entry.adId === lead.metaAdId
    && entry.creativeLabel === lead.creativeLabel
  ))
  return mapping
    ? { status: "VERIFIED", verified: true, mapping }
    : { status: "UNVERIFIED", verified: false, reason: "exact_mapping_not_found" }
}
