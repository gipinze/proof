/**
 * Week-over-week change.
 *
 * Pure so the awkward cases (no previous week, an empty week) are decided once
 * and tested, rather than guessed at in the UI.
 */
export function weekDeltaRatio(buckets: { volume: number }[]): number | null {
  if (buckets.length < 2) return null;
  const current = buckets[buckets.length - 1].volume;
  const previous = buckets[buckets.length - 2].volume;
  if (previous <= 0 || current <= 0) return null;
  return (current - previous) / previous;
}
