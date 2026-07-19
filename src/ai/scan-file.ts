import type { UseGristResult } from "grist-widget-sdk"

import type { FileMetadata } from "@/types"

import { runGatewayCompletion } from "./gateway-client"
import { resolveGatewayModel, type ResolvedGatewayConfig } from "./gateway-config"
import { buildScanMessages } from "./scan-prompt"
import { truncateForAiInput } from "./scan-input"
import {
  buildFileMetadataFromScan,
  parseScanModelJson,
  type ScanModelOutput,
} from "./scan-schema"
import type { ScanPhase } from "./scan-progress"
import { extractPdfText } from "@/lib/pdf-text"

export type ScanErrorCode =
  | "not_configured"
  | "file_too_large"
  | "unsupported_type"
  | "read_failed"
  | "gateway_failed"
  | "parse_failed"
  | "write_failed"

export type ScanFileResult =
  | {
      ok: true
      metadata: FileMetadata
      rawExtract: string
      aiText: string
    }
  | {
      ok: false
      code: ScanErrorCode
      message: string
    }

const MAX_BLOB_BYTES = 8 * 1024 * 1024

export async function prepareTextFromBlob(
  blob: Blob,
  contentType: string,
  fileName: string
): Promise<{ text: string } | { error: ScanErrorCode; message: string }> {
  if (blob.size > MAX_BLOB_BYTES) {
    return {
      error: "file_too_large",
      message: `File is too large to scan (${Math.round(blob.size / 1024 / 1024)} MB).`,
    }
  }

  const mime = contentType || blob.type || "application/octet-stream"

  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/javascript"
  ) {
    try {
      const text = await blob.text()
      return { text }
    } catch {
      return { error: "read_failed", message: "Could not read the file as text." }
    }
  }

  if (mime === "application/pdf") {
    try {
      const text = await extractPdfText(blob)
      const trimmed = text.trim()
      if (!trimmed) {
        return {
          error: "unsupported_type",
          message:
            "This PDF contains no extractable text (it may be scanned). OCR is not enabled yet.",
        }
      }
      return { text: trimmed }
    } catch (err) {
      return {
        error: "read_failed",
        message:
          err instanceof Error
            ? `Failed to extract PDF text: ${err.message}`
            : "Failed to extract PDF text.",
      }
    }
  }

  if (mime.startsWith("image/")) {
    return {
      error: "unsupported_type",
      message: "Image scanning requires a vision-capable pipeline (not enabled yet).",
    }
  }

  return {
    error: "unsupported_type",
    message: `Unsupported file type for scanning (${fileName}): ${mime || "unknown"}.`,
  }
}

async function persistScanFields(
  w: UseGristResult,
  fields: Record<string, unknown>
): Promise<void> {
  if (w.mode !== "row" || !w.record?.id) return
  await w.table.update({
    id: w.record.id as number,
    fields: w.mapBack(fields),
  })
}

async function persistScanError(
  w: UseGristResult,
  args: {
    attachmentId: string
    config: ResolvedGatewayConfig
    modelKey: string
    fileName?: string
    mimeType?: string
    byteSize?: number
    code: string
    message: string
    rawExtract?: string
  }
): Promise<void> {
  if (w.mode !== "row" || !w.record?.id) return
  try {
    const metadata: FileMetadata = {
      schemaVersion: 1,
      scannedAt: new Date().toISOString(),
      attachmentId: args.attachmentId,
      fileName: args.fileName,
      mimeType: args.mimeType,
      byteSize: args.byteSize,
      model: resolveGatewayModel(args.config, args.modelKey),
      provider: args.config.provider,
      error: { code: args.code, message: args.message },
    }
    const patch: Record<string, unknown> = {
      FileMetadata: JSON.stringify(metadata),
    }
    if (args.rawExtract !== undefined) {
      patch.FileExtract = args.rawExtract
    }
    await persistScanFields(w, patch)
  } catch {
    /* best-effort */
  }
}

export async function scanFileWithAi(args: {
  w: UseGristResult
  config: ResolvedGatewayConfig
  attachmentId: string
  fileName?: string
  modelKey?: string
  signal?: AbortSignal
  onProgress?: (phase: ScanPhase) => void
}): Promise<ScanFileResult> {
  const { w, config, attachmentId, fileName, signal, onProgress } = args
  const modelKey = args.modelKey?.trim()
  const progress = (phase: ScanPhase) => onProgress?.(phase)

  if (!config.apiKey.trim() || !config.apiUrl.trim()) {
    return {
      ok: false,
      code: "not_configured",
      message: "Configure the AI gateway before scanning.",
    }
  }

  if (!modelKey || !config.modelById[modelKey]) {
    return {
      ok: false,
      code: "not_configured",
      message: "Select a model in AI settings before scanning.",
    }
  }

  let blob: Blob
  let contentType: string
  try {
    progress("downloading")
    const fetched = await w.fetchAttachmentBlob(attachmentId)
    blob = fetched.blob
    contentType = fetched.contentType || blob.type
  } catch (err) {
    return {
      ok: false,
      code: "read_failed",
      message: err instanceof Error ? err.message : "Failed to download attachment.",
    }
  }

  progress("extracting")
  const prepared = await prepareTextFromBlob(
    blob,
    contentType,
    fileName ?? `attachment-${attachmentId}`
  )
  if ("error" in prepared) {
    await persistScanError(w, {
      attachmentId,
      config,
      modelKey,
      fileName,
      mimeType: contentType,
      byteSize: blob.size,
      code: prepared.error,
      message: prepared.message,
    })
    return { ok: false, code: prepared.error, message: prepared.message }
  }

  const rawExtract = prepared.text

  let scanOutput: ScanModelOutput
  try {
    progress("ai")
    const raw = await runGatewayCompletion({
      config,
      modelKey,
      messages: buildScanMessages({
        fileName: fileName ?? `attachment-${attachmentId}`,
        mimeType: contentType,
        textContent: truncateForAiInput(rawExtract),
      }),
      maxTokens: 4096,
      signal,
    })
    scanOutput = parseScanModelJson(raw)
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI scan failed."
    const code: ScanErrorCode = message.includes("JSON")
      ? "parse_failed"
      : "gateway_failed"
    await persistScanError(w, {
      attachmentId,
      config,
      modelKey,
      fileName,
      mimeType: contentType,
      byteSize: blob.size,
      code,
      message,
      rawExtract,
    })
    return { ok: false, code, message }
  }

  const metadata = buildFileMetadataFromScan({
    scan: scanOutput,
    attachmentId,
    fileName,
    mimeType: contentType,
    byteSize: blob.size,
    model: resolveGatewayModel(config, modelKey),
    provider: config.provider,
  })

  try {
    progress("saving")
    await persistScanFields(w, {
      FileMetadata: JSON.stringify(metadata),
      FileExtract: rawExtract,
      AiText: scanOutput.aiText,
    })
  } catch (err) {
    return {
      ok: false,
      code: "write_failed",
      message: err instanceof Error ? err.message : "Failed to save scan results.",
    }
  }

  return {
    ok: true,
    metadata,
    rawExtract,
    aiText: scanOutput.aiText,
  }
}
