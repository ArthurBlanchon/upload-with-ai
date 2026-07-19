import type { FileMetadata } from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"

type FileMainProps = {
  metadata: FileMetadata | null
  rawExtract: string | null
  aiText: string | null
  placeholder?: string
}

export function FileMain({
  metadata,
  rawExtract,
  aiText,
  placeholder,
}: FileMainProps) {
  const hasContent = Boolean(
    rawExtract?.trim() || aiText?.trim() || metadata
  )

  if (!hasContent) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">
          {placeholder ??
            "Run Scan with AI to extract raw text, metadata, and AI text into this document."}
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-4 p-4">
        {metadata?.error ? (
          <Alert variant="destructive">
            <AlertTitle>Last scan failed</AlertTitle>
            <AlertDescription>
              {metadata.error.message}
              {metadata.error.code ? ` (${metadata.error.code})` : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {metadata?.summary ? (
          <section className="space-y-1">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Summary
            </h2>
            <p className="text-sm leading-relaxed">{metadata.summary}</p>
          </section>
        ) : null}

        {metadata?.keywords?.length ? (
          <section className="space-y-1">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Keywords
            </h2>
            <p className="text-sm">{metadata.keywords.join(", ")}</p>
          </section>
        ) : null}

        {metadata ? (
          <section className="space-y-1">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Metadata
            </h2>
            <pre className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
              {JSON.stringify(
                {
                  title: metadata.title,
                  language: metadata.language,
                  pageCount: metadata.pageCount,
                  entities: metadata.entities,
                  custom: metadata.custom,
                },
                null,
                2
              )}
            </pre>
          </section>
        ) : null}

        {aiText?.trim() ? (
          <section className="space-y-1">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              AI text
            </h2>
            <pre className="whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm leading-relaxed">
              {aiText}
            </pre>
          </section>
        ) : null}

        {rawExtract?.trim() ? (
          <section className="space-y-1">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Raw extract
            </h2>
            <pre className="whitespace-pre-wrap rounded-md border bg-muted/10 p-3 text-sm leading-relaxed text-muted-foreground">
              {rawExtract}
            </pre>
          </section>
        ) : null}
      </div>
    </ScrollArea>
  )
}
