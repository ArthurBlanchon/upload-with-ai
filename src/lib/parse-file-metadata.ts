import type { FileMetadata } from "@/types"

export function parseFileMetadataCell(value: unknown): FileMetadata | null {
  if (value === null || value === undefined) return null

  let record: unknown = value
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    try {
      record = JSON.parse(trimmed) as unknown
    } catch {
      return null
    }
  }

  if (!record || typeof record !== "object") return null
  const obj = record as Record<string, unknown>
  if (obj.schemaVersion !== 1) return null
  if (typeof obj.scannedAt !== "string" || typeof obj.attachmentId !== "string") {
    return null
  }
  if (typeof obj.model !== "string") return null
  if (obj.provider !== "openai" && obj.provider !== "genial") return null

  return obj as FileMetadata
}

export function isScanStale(
  metadata: FileMetadata | null,
  currentAttachmentId: string | undefined
): boolean {
  if (!metadata?.attachmentId || !currentAttachmentId) return false
  return metadata.attachmentId !== currentAttachmentId
}
