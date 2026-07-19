export type FileMetadata = {
  schemaVersion: 1
  scannedAt: string
  attachmentId: string
  fileName?: string
  mimeType?: string
  byteSize?: number
  model: string
  provider: "openai" | "genial"
  summary?: string
  title?: string
  language?: string
  pageCount?: number
  keywords?: string[]
  entities?: Array<{ type: string; value: string }>
  custom?: Record<string, unknown>
  error?: { code: string; message: string }
}

export type MappedRow = {
  File: unknown
  FileMetadata: FileMetadata | string | Record<string, unknown> | null
  FileExtract: string | null
  AiText: string | null
}

export type ScanWidgetOptions = {
  autoScanOnUpload?: boolean
  scanModel?: string
}
