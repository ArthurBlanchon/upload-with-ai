import { extractGristAttachmentId } from "grist-widget-sdk"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import type { ScanPhase } from "@/ai/scan-progress"
import { scanFileWithAi } from "@/ai/scan-file"
import { useAiGatewayConfig } from "@/ai/use-ai-gateway-config"
import { AiGatewaySettingsDialog } from "@/components/ai-gateway-settings-dialog"
import { FileDropZone } from "@/components/file-drop-zone"
import {
  FileHeader,
  resolveHeaderDate,
  resolveHeaderTitle,
} from "@/components/file-header"
import { FileMain } from "@/components/file-main"
import { GatewayModelSelector } from "@/components/gateway-model-selector"
import { ScanProgressOverlay } from "@/components/scan-progress-overlay"
import { useFileUpload } from "@/hooks/use-file-upload"
import { isScanStale, parseFileMetadataCell } from "@/lib/parse-file-metadata"
import type { MappedRow } from "@/types"

import { useGrist, useWidgetMetadata } from "grist-widget-sdk"

import { WIDGET_METADATA } from "@/grist-options"

function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="font-medium">{title}</h2>
        {body ? <p className="mt-2 text-sm text-muted-foreground">{body}</p> : null}
      </div>
    </div>
  )
}

export function WidgetApp() {
  useWidgetMetadata(WIDGET_METADATA)
  const w = useGrist<Record<string, unknown>, MappedRow>()
  const gateway = useAiGatewayConfig()
  const { uploading, handleFiles } = useFileUpload(w)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanPhase, setScanPhase] = useState<ScanPhase | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const attachmentId = extractGristAttachmentId(w.mappedRecord?.File ?? null)
  const metadata = parseFileMetadataCell(w.mappedRecord?.FileMetadata ?? null)
  const rawExtract =
    typeof w.mappedRecord?.FileExtract === "string"
      ? w.mappedRecord.FileExtract
      : null
  const aiText =
    typeof w.mappedRecord?.AiText === "string" ? w.mappedRecord.AiText : null
  const stale = isScanStale(metadata, attachmentId)

  const showUpload =
    w.mode === "empty" || w.mode === "new-row" || (w.mode === "row" && !attachmentId)

  const getAttachmentUrl = w.getAttachmentUrl

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!attachmentId) {
        setDownloadUrl(null)
        return
      }
      try {
        const url = await getAttachmentUrl(attachmentId, { readOnly: true })
        if (!cancelled) setDownloadUrl(url)
      } catch {
        if (!cancelled) setDownloadUrl(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [attachmentId, getAttachmentUrl])

  const openSettings = useCallback(() => setSettingsOpen(true), [])

  const handleScan = useCallback(async () => {
    if (!gateway.configured) {
      toast.error("Configure the AI gateway first", {
        action: {
          label: "Settings",
          onClick: openSettings,
        },
      })
      return
    }

    if (!gateway.selectedModelKey) {
      toast.error("Select a model before scanning", {
        action: {
          label: "Settings",
          onClick: openSettings,
        },
      })
      return
    }

    if (!w.columnMappingStatus.ok) {
      const missing = w.columnMappingStatus.missing
      if (
        missing.includes("FileMetadata") ||
        missing.includes("FileExtract") ||
        missing.includes("AiText")
      ) {
        toast.error(
          "Map File metadata, File extract, and AI text columns in widget settings."
        )
        return
      }
    }

    if (w.mode !== "row" || !w.record?.id) {
      toast.error("Select a saved row with a file to scan.")
      return
    }

    if (!attachmentId) {
      toast.error("This row has no file to scan.")
      return
    }

    setScanning(true)
    setScanPhase("downloading")
    try {
      const result = await scanFileWithAi({
        w,
        config: gateway.config,
        attachmentId,
        fileName: metadata?.fileName,
        modelKey: gateway.selectedModelKey,
        onProgress: setScanPhase,
      })
      if (result.ok) {
        toast.success("Scan complete")
      } else {
        toast.error(result.message)
      }
    } finally {
      setScanning(false)
      setScanPhase(null)
    }
  }, [
    attachmentId,
    gateway.config,
    gateway.configured,
    gateway.selectedModelKey,
    metadata?.fileName,
    openSettings,
    w,
  ])

  const settingsDialog = (
    <AiGatewaySettingsDialog
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
      initialConfig={gateway.config}
      onSave={(c) => gateway.persist(c)}
      onClear={gateway.reset}
    />
  )

  const toolbarActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <GatewayModelSelector
        models={gateway.availableModels}
        selectedModelKey={gateway.selectedModelKey}
        onSelect={gateway.setSelectedModelKey}
      />
      <button
        type="button"
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        onClick={openSettings}
      >
        AI settings
      </button>
    </div>
  )

  if (w.status === "booting") {
    return <EmptyState title="Connecting to Grist…" />
  }

  if (!w.columnMappingStatus.ok) {
    const missing = w.columnMappingStatus.missing.join(", ")
    return (
      <EmptyState
        title="Column mapping required"
        body={`Map these columns in the widget configuration panel: ${missing}`}
      />
    )
  }

  if (showUpload) {
    return (
      <>
        <div className="relative flex h-full min-h-0 flex-col">
          <div className="absolute right-3 top-3 z-10">{toolbarActions}</div>
          <FileDropZone
            uploading={uploading}
            disabled={w.actionStatus === "running"}
            onFiles={handleFiles}
          />
        </div>
        {settingsDialog}
      </>
    )
  }

  const headerTitle = resolveHeaderTitle(metadata, metadata?.fileName)
  const headerDate = resolveHeaderDate(metadata)

  return (
    <>
      <div className="relative flex h-full min-h-0 flex-col">
        {scanPhase ? <ScanProgressOverlay phase={scanPhase} /> : null}
        <FileHeader
          title={headerTitle}
          dateLabel={headerDate}
          stale={stale}
          scanning={scanning}
          downloadUrl={downloadUrl}
          downloadFileName={metadata?.fileName ?? `attachment-${attachmentId}`}
          metadata={metadata}
          availableModels={gateway.availableModels}
          selectedModelKey={gateway.selectedModelKey}
          onModelSelect={gateway.setSelectedModelKey}
          onScan={() => void handleScan()}
          onOpenSettings={openSettings}
          scanDisabled={scanning || w.actionStatus === "running"}
        />
        <FileMain metadata={metadata} rawExtract={rawExtract} aiText={aiText} />
      </div>
      {settingsDialog}
    </>
  )
}
