import { CheckIcon } from "lucide-react"

import type { ScanPhase } from "@/ai/scan-progress"
import { SCAN_PHASES, scanPhaseIndex } from "@/ai/scan-progress"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type ScanProgressOverlayProps = {
  phase: ScanPhase
}

export function ScanProgressOverlay({ phase }: ScanProgressOverlayProps) {
  const activeIndex = scanPhaseIndex(phase)
  const activeStep = SCAN_PHASES[activeIndex]

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Scan in progress"
    >
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <Spinner className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0 space-y-1">
            <p className="font-medium">Scanning document</p>
            <p className="text-sm text-muted-foreground">
              {activeStep?.description ?? "Working…"}
            </p>
          </div>
        </div>

        <ol className="mt-6 space-y-2">
          {SCAN_PHASES.map((step, index) => {
            const done = index < activeIndex
            const current = index === activeIndex
            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
                  current && "bg-muted/60",
                  !done && !current && "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border",
                    done && "border-primary/30 bg-primary/10 text-primary",
                    current && "border-primary bg-primary/15 text-primary",
                    !done && !current && "border-border bg-muted/30"
                  )}
                  aria-hidden
                >
                  {done ? (
                    <CheckIcon className="size-3.5" />
                  ) : current ? (
                    <Spinner className="size-3.5" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                  )}
                </span>
                <span className={cn(current && "font-medium")}>{step.label}</span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
