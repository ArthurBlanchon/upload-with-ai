import { useCallback, useState } from "react"
import { toast } from "sonner"

import {
  gristAttachmentCellValue,
  mergeGristAttachmentCellValue,
  type UseGristResult,
} from "grist-widget-sdk"

import { pickFiles } from "@/lib/file-picker"

const MAX_FILE_SIZE = 25 * 1024 * 1024

export function useFileUpload(w: UseGristResult) {
  const [uploading, setUploading] = useState(false)

  const uploadFile = useCallback(
    async (file: File) => {
      if (uploading || w.actionStatus === "running") return

      setUploading(true)
      try {
        const { firstId } = await w.uploadAttachment(file)
        const fileCell =
          w.mode === "new-row" || !w.record?.id
            ? gristAttachmentCellValue(firstId)
            : mergeGristAttachmentCellValue(
                (w.mappedRecord as { File?: unknown } | null)?.File,
                [firstId]
              )
        const fields = w.mapBack({
          File: fileCell,
        } as Parameters<typeof w.mapBack>[0])

        if (w.mode === "new-row" || !w.record?.id) {
          await w.table.create({ fields })
          toast.success("File uploaded — new row created")
        } else {
          await w.table.update({
            id: w.record.id as number,
            fields,
          })
          toast.success("File uploaded")
        }
        return firstId
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed"
        toast.error(message)
        throw err
      } finally {
        setUploading(false)
      }
    },
    [uploading, w]
  )

  const handleFiles = useCallback(
    async (fileList: File[] | FileList) => {
      const { files, error } = pickFiles(fileList, {
        maxFiles: 1,
        maxFileSize: MAX_FILE_SIZE,
      })
      if (error) {
        toast.warning(error.message)
      }
      if (files.length === 0) return
      await uploadFile(files[0]!)
    },
    [uploadFile]
  )

  return {
    uploading: uploading || w.actionStatus === "running",
    uploadFile,
    handleFiles,
  }
}
