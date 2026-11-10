import { getExercise, type ExerciseDef } from '../data/exercises';
import type { MuscleId } from '../data/anatomy';

export type SetEntry = {
  id?: number;
  exerciseId: string;
  weight: number;
  reps: number;
  /** Metres, for distance-measured work (carries, sleds, machine cardio). */
  distanceM?: number;
  /** Seconds spent on a distance set — lets intervals carry a pace. */
  durationS?: number;
  /** Rate of perceived exertion, 1–10. */
  rpe?: number;
  isWarmup?: boolean;
};

export type SessionSummary = {
  volume: number;
  /** Total metres covered by distance-measured sets. */
  distanceM: number;
  /** kg·m — how much load was actually moved over that distance. */
  loadDistance: number;
  /** Seconds spent across distance sets (0 when nobody timed them). */
  distanceTimeS: number;
  sets: number;
  reps: number;
  exercises: number;
  topSets: { exercise: ExerciseDef; volume: number; sets: number; distanceM: number }[];
};

export function isDistance(exercise?: ExerciseDef): boolean {
  return (exercise ?? { measure: 'reps' }).measure === 'distance';
}

/** Total external load moved by one set. Distance sets contribute kg·m instead. */
export function setVolume(set: SetEntry, exercise?: ExerciseDef): number {
  const def = exercise ?? getExercise(set.exerciseId);
  if (set.isWarmup) return 0;
  if (def.measure === 'distance') return 0;
  return Math.max(0, set.weight) * def.loadFactor * Math.max(0, set.reps);
}

export function setLoadDistance(set: SetEntry, exercise?: ExerciseDef): number {
  const def = exercise ?? getExercise(set.exerciseId);
  if (set.isWarmup || def.measure !== 'distance') return 0;
  return Math.max(0, set.weight) * def.loadFactor * Math.max(0, set.distanceM ?? 0);
}

export function summarizeSets(sets: SetEntry[]): SessionSummary {
  const byExercise = new Map<string, { volume: number; sets: number; distanceM: number }>();
  let volume = 0;
  let distanceM = 0;
  let loadDistance = 0;
  let distanceTimeS = 0;
  let reps = 0;
  let workingSets = 0;

  for (const set of sets) {
    if (set.isWarmup) continue;
    const def = getExercise(set.exerciseId);
    const v = setVolume(set, def);
    const ld = setLoadDistance(set, def);
    const d = def.measure === 'distance' ? Math.max(0, set.distanceM ?? 0) : 0;

    volume += v;
    loadDistance += ld;
    distanceM += d;
    if (def.measure === 'distance') distanceTimeS += Math.max(0, set.durationS ?? 0);
    reps += def.measure === 'distance' ? 0 : set.reps;
    workingSets += 1;

    const cur = byExercise.get(set.exerciseId) ?? { volume: 0, sets: 0, distanceM: 0 };
    cur.volume += v;
    cur.distanceM += d;
    cur.sets += 1;
    byExercise.set(set.exerciseId, cur);
  }

  const topSets = [...byExercise.entries()]
    .map(([id, v]) => ({ exercise: getExercise(id), volume: v.volume, sets: v.sets, distanceM: v.distanceM }))
    .sort((a, b) => b.volume - a.volume || b.distanceM - a.distanceM);

  return {
    volume,
    distanceM,
    loadDistance,
    distanceTimeS,
    sets: workingSets,
    reps,
    exercises: topSets.length,
    topSets,
  };
}

const ROLE_WEIGHT: Record<number, number> = { 3: 1, 2: 0.45, 1: 0.16 };

export type MuscleLoad = Partial<Record<MuscleId, number>>;

/**
 * Muscle emphasis for a session. Counts hard sets weighted by how much the
 * movement actually uses each muscle — the standard way to rank "what did I
 * train", and stable across heavy vs light days.
 */
export function muscleLoad(sets: SetEntry[]): MuscleLoad {
  const load: MuscleLoad = {};
  for (const set of sets) {
    if (set.isWarmup) continue;
    const def = getExercise(set.exerciseId);
    for (const [muscle, role] of Object.entries(def.muscles) as [MuscleId, number][]) {
      load[muscle] = (load[muscle] ?? 0) + (ROLE_WEIGHT[role] ?? 0.3);
    }
  }
  return load;
}

/** 0..1 per muscle, normalised to the hardest-hit muscle in the set. */
export function normalisedLoad(load: MuscleLoad): Record<string, number> {
  const values = Object.values(load).filter((v): v is number => typeof v === 'number');
  const max = Math.max(0.0001, ...values);
  const out: Record<string, number> = {};
  for (const [muscle, value] of Object.entries(load)) {
    if (typeof value !== 'number' || value <= 0) continue;
    out[muscle] = Math.min(1, Math.pow(value / max, 0.9));
  }
  return out;
}

export function rankedMuscles(load: MuscleLoad): MuscleId[] {
  return (Object.entries(load) as [MuscleId, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
