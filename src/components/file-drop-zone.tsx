import { UploadIcon } from "lucide-react"
import { useCallback, useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type FileDropZoneProps = {
  disabled?: boolean
  uploading?: boolean
  onFiles: (files: File[] | FileList) => void | Promise<void>
  className?: string
}

export function FileDropZone({
  disabled,
  uploading,
  onFiles,
  className,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const openPicker = useCallback(() => {
    if (disabled || uploading) return
    inputRef.current?.click()
  }, [disabled, uploading])

  const onInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const list = event.currentTarget.files
      if (list?.length) void onFiles(list)
      event.currentTarget.value = ""
    },
    [onFiles]
  )

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault()
    }
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return
      e.preventDefault()
      if (disabled || uploading) return
      if (e.dataTransfer.files.length > 0) void onFiles(e.dataTransfer.files)
    }
    document.addEventListener("dragover", onDragOver)
    document.addEventListener("drop", onDrop)
    return () => {
      document.removeEventListener("dragover", onDragOver)
      document.removeEventListener("drop", onDrop)
    }
  }, [disabled, onFiles, uploading])

  return (
    <div
      ref={rootRef}
      className={cn(
        "flex h-full min-h-0 flex-col items-center justify-center gap-6 p-8",
        className
      )}
    >
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={openPicker}
        className={cn(
          "flex w-full max-w-lg flex-col items-center gap-4 rounded-xl border-2 border-dashed p-12 text-center transition-colors",
          "border-muted-foreground/30 bg-muted/20 hover:border-primary/50 hover:bg-muted/40",
          "disabled:pointer-events-none disabled:opacity-50"
        )}
      >
        {uploading ? (
          <Spinner className="size-10" />
        ) : (
          <UploadIcon className="size-10 text-muted-foreground" />
        )}
        <div className="space-y-1">
          <p className="text-lg font-medium">Drop a new file here</p>
          <p className="text-sm text-muted-foreground">
            One file per row · max 25 MB
          </p>
        </div>
      </button>

      <Button
        type="button"
        size="lg"
        disabled={disabled || uploading}
        onClick={openPicker}
      >
        {uploading ? "Uploading…" : "Upload file"}
      </Button>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={onInputChange}
      />
    </div>
  )
}
