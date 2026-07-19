import type { FileMetadata } from "@/types"

export type ScanModelOutput = {
  summary?: string
  title?: string
  language?: string
  pageCount?: number
  keywords?: string[]
  entities?: Array<{ type: string; value: string }>
  custom?: Record<string, unknown>
  aiText: string
}

const MAX_AI_TEXT_CHARS = 500_000

export function parseScanModelJson(raw: string): ScanModelOutput {
  const trimmed = raw.trim()
  const jsonText = extractJsonObject(trimmed)
  const parsed = JSON.parse(jsonText) as Record<string, unknown>

  const aiTextRaw =
    (typeof parsed.aiText === "string" ? parsed.aiText : undefined) ??
    (typeof parsed.extract === "string" ? parsed.extract : undefined)
  const aiText = aiTextRaw?.trim() ?? ""
  if (!aiText) {
    throw new Error('AI response is missing required field "aiText".')
  }
  if (aiText.length > MAX_AI_TEXT_CHARS) {
    throw new Error("AI text exceeds the maximum allowed length.")
  }

  const output: ScanModelOutput = { aiText }

  if (typeof parsed.summary === "string") output.summary = parsed.summary.trim()
  if (typeof parsed.title === "string") output.title = parsed.title.trim()
  if (typeof parsed.language === "string") output.language = parsed.language.trim()
  if (typeof parsed.pageCount === "number" && Number.isFinite(parsed.pageCount)) {
    output.pageCount = parsed.pageCount
  }
  if (Array.isArray(parsed.keywords)) {
    output.keywords = parsed.keywords
      .filter((k): k is string => typeof k === "string")
      .map((k) => k.trim())
      .filter(Boolean)
  }
  if (Array.isArray(parsed.entities)) {
    output.entities = parsed.entities
      .filter(
        (e): e is { type: string; value: string } =>
          Boolean(
            e &&
              typeof e === "object" &&
              typeof (e as { type?: unknown }).type === "string" &&
              typeof (e as { value?: unknown }).value === "string"
          )
      )
      .map((e) => ({ type: e.type.trim(), value: e.value.trim() }))
      .filter((e) => e.type && e.value)
  }
  if (parsed.custom && typeof parsed.custom === "object" && !Array.isArray(parsed.custom)) {
    output.custom = parsed.custom as Record<string, unknown>
  }

  return output
}

export function buildFileMetadataFromScan(args: {
  scan: ScanModelOutput
  attachmentId: string
  fileName?: string
  mimeType?: string
  byteSize?: number
  model: string
  provider: "openai" | "genial"
}): FileMetadata {
  return {
    schemaVersion: 1,
    scannedAt: new Date().toISOString(),
    attachmentId: args.attachmentId,
    fileName: args.fileName,
    mimeType: args.mimeType,
    byteSize: args.byteSize,
    model: args.model,
    provider: args.provider,
    summary: args.scan.summary,
    title: args.scan.title,
    language: args.scan.language,
    pageCount: args.scan.pageCount,
    keywords: args.scan.keywords,
    entities: args.scan.entities,
    custom: args.scan.custom,
  }
}

function extractJsonObject(text: string): string {
  if (text.startsWith("{")) return text

  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(text)
  if (fence?.[1]) return fence[1].trim()

  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1)
  }

  throw new Error("AI response did not contain a JSON object.")
}
