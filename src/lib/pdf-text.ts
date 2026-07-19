type PdfJsModule = typeof import("pdfjs-dist")

/**
 * Extract text from a PDF Blob using PDF.js (`pdfjs-dist`).
 *
 * Notes:
 * - Works for digital PDFs (text layer present).
 * - Scanned PDFs will usually return empty text; OCR is a separate step.
 */
export async function extractPdfText(blob: Blob): Promise<string> {
  const pdfjs = (await import("pdfjs-dist")) as PdfJsModule

  // Configure worker for bundlers like Vite.
  // pdfjs-dist uses a separate worker script.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString()

  const data = new Uint8Array(await blob.arrayBuffer())
  // verbosity 0 = errors only; skips font-parser warnings like "TT: undefined function: 32"
  const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise

  try {
    const pages: string[] = []
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item) => {
          if (!item || typeof item !== "object") return ""
          if (!("str" in item)) return ""
          const str = (item as { str?: unknown }).str
          return typeof str === "string" ? str : ""
        })
        .filter(Boolean)
        .join(" ")
      pages.push(pageText)
    }
    return pages.join("\n\n")
  } finally {
    await doc.destroy()
  }
}

