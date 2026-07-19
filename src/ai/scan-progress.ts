export type ScanPhase = "downloading" | "extracting" | "ai" | "saving"

export type ScanPhaseInfo = {
  id: ScanPhase
  label: string
  description: string
}

export const SCAN_PHASES: ScanPhaseInfo[] = [
  {
    id: "downloading",
    label: "Download",
    description: "Fetching the attachment from Grist…",
  },
  {
    id: "extracting",
    label: "Extract text",
    description: "Reading plain text or PDF content locally…",
  },
  {
    id: "ai",
    label: "AI analysis",
    description: "Sending text to the gateway and parsing metadata…",
  },
  {
    id: "saving",
    label: "Save",
    description: "Writing extract, metadata, and AI text to the row…",
  },
]

export function scanPhaseIndex(phase: ScanPhase): number {
  return SCAN_PHASES.findIndex((p) => p.id === phase)
}
