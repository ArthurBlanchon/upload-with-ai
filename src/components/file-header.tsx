import { DownloadIcon, KeyRoundIcon, ScanIcon } from "lucide-react"

import type { GatewayModelOption } from "@/ai/gateway-models"
import { GatewayModelSelector } from "@/components/gateway-model-selector"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { FileMetadata } from "@/types"
import { parseFileMetadataCell } from "@/lib/parse-file-metadata"

type FileHeaderProps = {
  title: string
  dateLabel: string
  stale?: boolean
  scanning?: boolean
  downloadUrl: string | null
  downloadFileName: string
  metadata: FileMetadata | null
  availableModels: GatewayModelOption[]
  selectedModelKey: string | null
  onModelSelect: (modelKey: string) => void
  onScan: () => void
  onOpenSettings: () => void
  scanDisabled?: boolean
  scanLabel?: string
}

export function FileHeader({
  title,
  dateLabel,
  stale,
  scanning,
  downloadUrl,
  downloadFileName,
  metadata,
  availableModels,
  selectedModelKey,
  onModelSelect,
  onScan,
  onOpenSettings,
  scanDisabled,
  scanLabel = "Scan with AI",
}: FileHeaderProps) {
  const scanError = metadata?.error

  return (
    <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-lg font-medium">{title}</h1>
          {stale ? (
            <Badge variant="outline" className="text-amber-700 dark:text-amber-300">
              Scan outdated
            </Badge>
          ) : null}
          {scanError ? (
            <Badge variant="destructive">Scan failed</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
        {metadata?.summary ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{metadata.summary}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <GatewayModelSelector
          models={availableModels}
          selectedModelKey={selectedModelKey}
          onSelect={onModelSelect}
          disabled={scanDisabled || scanning}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenSettings}
          title="AI gateway settings"
        >
          <KeyRoundIcon className="size-4" />
          <span className="sr-only sm:not-sr-only">AI settings</span>
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={scanDisabled || scanning || !selectedModelKey}
          onClick={onScan}
        >
          <ScanIcon className="size-4" />
          {scanning ? "Scanning…" : stale ? "Re-scan" : scanLabel}
        </Button>
        {downloadUrl ? (
          <Button asChild variant="outline" size="sm">
            <a href={downloadUrl} download={downloadFileName}>
              <DownloadIcon className="size-4" />
              Download
            </a>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>
            <DownloadIcon className="size-4" />
            Download
          </Button>
        )}
      </div>
    </header>
  )
}

export function resolveHeaderTitle(
  metadata: FileMetadata | null,
  fileName: string | undefined
): string {
  return metadata?.title?.trim() || fileName?.trim() || "Uploaded file"
}

export function resolveHeaderDate(
  metadata: FileMetadata | null,
  scannedAtFallback?: string
): string {
  const scanned = metadata?.scannedAt ?? scannedAtFallback
  if (scanned) {
    try {
      return new Date(scanned).toLocaleString()
    } catch {
      return scanned
    }
  }
  return "Not scanned yet"
}

export { parseFileMetadataCell }
