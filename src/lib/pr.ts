/**
 * Personal-record maths.
 *
 * Kept out of the database layer so the rules can be tested directly: a
 * first-ever lift is not a PR, and re-opening a session must never make it
 * beat itself.
 */

/**
 * Epley estimated 1RM on the **total** load — callers pass a per-hand dumbbell
 * weight already doubled by the exercise's loadFactor.
 */
export function estimate1rm(weight: number, loadFactor: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * loadFactor * (1 + reps / 30);
}

/** A best-in-session only counts as a record when there was something to beat. */
export function isPersonalRecord(best: number, previousBest: number): boolean {
  if (previousBest <= 0) return false;
  return best > previousBest + 0.01;
}

/** Best estimated 1RM across a set of candidate lifts. */
export function best1rm(
  lifts: { weight: number; reps: number }[],
  loadFactor: number,
): number {
  return lifts.reduce((max, lift) => Math.max(max, estimate1rm(lift.weight, loadFactor, lift.reps)), 0);
}
