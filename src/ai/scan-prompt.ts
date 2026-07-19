import { MAX_SCAN_INPUT_CHARS } from "./scan-input"

const SCAN_SYSTEM_PROMPT = `You are a document analysis assistant. You receive raw text extracted from an uploaded document (not the original binary).

Respond with a single JSON object only (no markdown fences, no commentary). Required shape:
{
  "summary": "2-4 sentence summary",
  "title": "short title",
  "language": "ISO 639-1 code or language name",
  "pageCount": number or null,
  "keywords": ["keyword", ...],
  "entities": [{"type": "person|org|place|other", "value": "..."}],
  "custom": {},
  "aiText": "cleaned, reading-order plain text suitable for search and display (normalize whitespace; do not invent content)"
}

Rules:
- "aiText" should reflect the document content from the input; you may normalize formatting but must not add facts.
- Use null or omit optional fields when unknown.
- Do not repeat the entire raw text verbatim unless needed; prefer a clean readable version.`

export function buildScanMessages(args: {
  fileName: string
  mimeType: string
  textContent: string
}): Array<{ role: "system" | "user"; content: string }> {
  const { fileName, mimeType, textContent } = args
  return [
    { role: "system", content: SCAN_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        `File name: ${fileName}`,
        `MIME type: ${mimeType}`,
        "",
        "Raw extracted document text:",
        textContent,
      ].join("\n"),
    },
  ]
}

export { MAX_SCAN_INPUT_CHARS }
