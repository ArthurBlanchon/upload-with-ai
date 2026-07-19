export type FilePickerErrorCode = "accept" | "max_files" | "max_file_size"

export type FilePickerError = {
  code: FilePickerErrorCode
  message: string
}

export type FilePickerOptions = {
  accept?: string
  maxFiles?: number
  maxFileSize?: number
}

export function matchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept || accept.trim() === "") return true

  const patterns = accept
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  return patterns.some((pattern) => {
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -1)
      return file.type.startsWith(prefix)
    }
    return file.type === pattern
  })
}

export function pickFiles(
  fileList: File[] | FileList,
  options: FilePickerOptions
): { files: File[]; error?: FilePickerError } {
  const incoming = [...fileList]
  const maxFiles = options.maxFiles ?? 1

  const accepted = incoming.filter((f) => matchesAccept(f, options.accept))
  if (incoming.length > 0 && accepted.length === 0) {
    return {
      files: [],
      error: { code: "accept", message: "No files match the accepted types." },
    }
  }

  const withinSize = (f: File) =>
    options.maxFileSize ? f.size <= options.maxFileSize : true
  const sized = accepted.filter(withinSize)
  if (accepted.length > 0 && sized.length === 0) {
    return {
      files: [],
      error: {
        code: "max_file_size",
        message: "All files exceed the maximum size.",
      },
    }
  }

  const capped = sized.slice(0, maxFiles)
  if (sized.length > maxFiles) {
    return {
      files: capped,
      error: {
        code: "max_files",
        message:
          maxFiles === 1
            ? "Only one file can be uploaded per row."
            : "Too many files. Some were not added.",
      },
    }
  }

  return { files: capped }
}
