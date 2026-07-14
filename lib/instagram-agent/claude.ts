// Claude-powered brains of the agent: reference analysis, draft generation,
// DM replies. Uses the official Anthropic SDK; ANTHROPIC_API_KEY must be set.

import Anthropic from "@anthropic-ai/sdk"
import {
  dmReplySystem,
  draftGenerationSystem,
  referenceAnalysisSystem,
} from "./prompts"
import type {
  ContentDraft,
  DmDecision,
  ReferenceAnalysis,
  ReferenceItem,
} from "./types"

const MODEL = "claude-opus-4-8"

let _client: Anthropic | null = null
function client(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured")
    }
    _client = new Anthropic()
  }
  return _client
}

function textOf(response: Anthropic.Message): string {
  for (const block of response.content) {
    if (block.type === "text") return block.text
  }
  throw new Error(`No text block in response (stop_reason: ${response.stop_reason})`)
}

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    format: {
      type: "string",
      enum: ["reel", "carousel", "single_image", "story", "unknown"],
    },
    hook: { type: "string", description: "The hook and its mechanism" },
    structure: { type: "string", description: "Beat-by-beat structure" },
    tone: { type: "string" },
    topics: { type: "array", items: { type: "string" } },
    whyItWorks: { type: "string" },
  },
  required: ["format", "hook", "structure", "tone", "topics", "whyItWorks"],
  additionalProperties: false,
} as const

export async function analyzeReference(
  text?: string,
  imageUrl?: string
): Promise<ReferenceAnalysis> {
  const content: Anthropic.ContentBlockParam[] = []
  if (imageUrl) {
    content.push({ type: "image", source: { type: "url", url: imageUrl } })
  }
  content.push({
    type: "text",
    text: `Analyze this Instagram content reference.${text ? `\n\nReference text/notes from the owner:\n${text}` : ""}`,
  })

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
    },
    system: referenceAnalysisSystem(),
    messages: [{ role: "user", content }],
  })
  return JSON.parse(textOf(response)) as ReferenceAnalysis
}

const DRAFTS_SCHEMA = {
  type: "object",
  properties: {
    drafts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          format: { type: "string", enum: ["single_image", "carousel"] },
          idea: { type: "string", description: "One-line concept of the post" },
          caption: { type: "string", description: "Full ready-to-post caption" },
          hashtags: { type: "array", items: { type: "string" } },
          imagePrompt: {
            type: "string",
            description: "Art-direction brief for the visual",
          },
        },
        required: ["format", "idea", "caption", "hashtags", "imagePrompt"],
        additionalProperties: false,
      },
    },
  },
  required: ["drafts"],
  additionalProperties: false,
} as const

type GeneratedDraft = Pick<
  ContentDraft,
  "format" | "idea" | "caption" | "hashtags" | "imagePrompt"
>

export async function generateDrafts(
  references: ReferenceItem[],
  count: number,
  extraInstruction?: string
): Promise<GeneratedDraft[]> {
  const library = references
    .map((r, i) => {
      const parts = [`Reference ${i + 1} (id: ${r.id})`]
      if (r.text) parts.push(`Owner notes: ${r.text}`)
      if (r.analysis) parts.push(`Analysis: ${JSON.stringify(r.analysis)}`)
      return parts.join("\n")
    })
    .join("\n\n")

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: DRAFTS_SCHEMA } },
    system: draftGenerationSystem(),
    messages: [
      {
        role: "user",
        content: `Reference library:\n\n${library || "(empty — rely on the brand voice alone)"}\n\nGenerate ${count} distinct post draft(s). Vary hooks and angles across drafts.${extraInstruction ? `\n\nExtra instruction from the owner: ${extraInstruction}` : ""}`,
      },
    ],
  })
  const parsed = JSON.parse(textOf(response)) as { drafts: GeneratedDraft[] }
  return parsed.drafts.slice(0, count)
}

const DM_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string", description: "The message to send back" },
    escalate: {
      type: "boolean",
      description: "True if the owner must be notified (lead, complaint, judgment call)",
    },
    reason: { type: "string", description: "Why escalation is needed, if it is" },
  },
  required: ["reply", "escalate"],
  additionalProperties: false,
} as const

export async function draftDmReply(incomingText: string): Promise<DmDecision> {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: DM_SCHEMA },
    },
    system: dmReplySystem(),
    messages: [
      {
        role: "user",
        content: `Incoming Instagram DM:\n\n${incomingText}`,
      },
    ],
  })
  return JSON.parse(textOf(response)) as DmDecision
}
