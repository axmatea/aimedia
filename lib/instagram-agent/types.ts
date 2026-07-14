// Shared types for the Instagram content agent.

export type ReferenceAnalysis = {
  format: "reel" | "carousel" | "single_image" | "story" | "unknown"
  hook: string
  structure: string
  tone: string
  topics: string[]
  whyItWorks: string
}

export type ReferenceItem = {
  id: string
  createdAt: string
  source: "telegram"
  text?: string
  imageUrl?: string
  analysis?: ReferenceAnalysis
}

export type DraftStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "published"
  | "failed"

export type ContentDraft = {
  id: string
  createdAt: string
  status: DraftStatus
  format: "single_image" | "carousel"
  idea: string
  caption: string
  hashtags: string[]
  // Publicly reachable image URL (required before the draft can be published).
  imageUrl?: string
  // Prompt for generating the visual when no image is attached yet.
  imagePrompt?: string
  sourceReferenceIds: string[]
  publishedMediaId?: string
  error?: string
}

export type DmDecision = {
  reply: string
  escalate: boolean
  reason?: string
}
