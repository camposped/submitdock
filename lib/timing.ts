/**
 * How long an attempt took, and what that is worth.
 *
 * The agent's time is measured: `submit begin` stamps the row and `submit done`
 * subtracts. Nothing here asks the agent how long it took, because a number a
 * model reports about itself is a number it can flatter.
 *
 * The human side cannot be measured, so it is declared. MANUAL_MINUTES is an
 * assumption and the UI prints it beside the result rather than folding it in:
 * "you saved 4 hours" is a claim, "24 forms at 8 minutes each, minus 19m of
 * agent time" is arithmetic someone can disagree with. On a product whose whole
 * argument is that unverified numbers are worthless, the saving has to show its
 * working.
 */

/**
 * One directory form, by hand: reading the fields, pasting three descriptions,
 * uploading a logo, finding the category. Deliberately conservative. Change it
 * here and every screen that quotes it follows.
 */
export const MANUAL_MINUTES = 8

export const MANUAL_MS = MANUAL_MINUTES * 60_000

export type TimeSaved = {
  /** Attempts that carry a measured duration. Not every row will. */
  timed: number
  /** Measured agent time across those attempts. */
  agentMs: number
  /** What the same attempts would have cost by hand, at MANUAL_MINUTES. */
  manualMs: number
  /** manualMs - agentMs, floored at zero. */
  savedMs: number
}

export function timeSaved(durations: readonly (number | null)[]): TimeSaved {
  const measured = durations.filter((d): d is number => typeof d === 'number' && d > 0)
  const agentMs = measured.reduce((sum, d) => sum + d, 0)
  const manualMs = measured.length * MANUAL_MS
  return {
    timed: measured.length,
    agentMs,
    manualMs,
    savedMs: Math.max(0, manualMs - agentMs),
  }
}

/**
 * Duration for a person: "2m 41s", "1h 12m", "18s".
 *
 * Two units at most, and the smaller one is dropped once the larger is big
 * enough to make it noise. Nobody needs the seconds on a four hour total.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0s'

  const totalSeconds = Math.round(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  if (minutes > 0) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  return `${seconds}s`
}
