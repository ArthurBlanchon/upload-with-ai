export const MAX_SCAN_INPUT_CHARS = 120_000

/** Truncate text sent to the LLM (raw extract column keeps full text). */
export function truncateForAiInput(text: string): string {
  if (text.length <= MAX_SCAN_INPUT_CHARS) return text
  return `${text.slice(0, MAX_SCAN_INPUT_CHARS)}\n\n[Truncated for model input.]`
}
