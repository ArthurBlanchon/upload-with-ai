import type { UseGristOptions } from "grist-widget-sdk"

export const GRIST_OPTIONS: UseGristOptions = {
  requiredAccess: "full",
  columns: [
    {
      name: "File",
      type: "Attachments",
      title: "File",
      description: "One attachment per row (required).",
    },
    {
      name: "FileMetadata",
      type: "Text",
      title: "File metadata",
      description: "AI metadata as JSON string (maps to file_metadata).",
    },
    {
      name: "FileExtract",
      type: "Text",
      title: "File extract",
      description: "Raw extracted text from the file (PDF.js / plain text), not AI.",
    },
    {
      name: "AiText",
      type: "Text",
      title: "AI text",
      description: "LLM-generated document text (maps to ai_text).",
    },
  ],
}

export const WIDGET_METADATA = {
  title: "Upload with AI",
  description:
    "Upload a file per row, extract raw text, and scan with AI into metadata and AI text columns.",
} as const
