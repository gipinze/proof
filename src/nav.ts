import type { SetEntry } from './lib/volume';

export type Route =
  | { name: 'home' }
  | { name: 'log'; editId?: number }
  | { name: 'run' }
  | { name: 'library' }
  | { name: 'session'; id: number }
  | { name: 'share'; id: number };

export type Nav = {
  push: (route: Route) => void;
  back: () => void;
  reset: (route: Route) => void;
  /** Load a saved lift back into the logger so it can be corrected. */
  editSession: (id: number) => void;
  /** Bumped after any write so lists know to refetch. */
  bump: () => void;
  dataVersion: number;
};

export type DraftSet = {
  key: string;
  weight: string;
  reps: string;
  /** Metres, only used by distance-measured exercises. */
  distance: string;
};

export type DraftExercise = { key: string; exerciseId: string; sets: DraftSet[] };

export type LiftDraft = {
  startedAt: number;
  title: string;
  exercises: DraftExercise[];
};

export const emptyDraft = (): LiftDraft => ({
  startedAt: Date.now(),
  title: '',
  exercises: [],
});

export function draftToSets(draft: LiftDraft): SetEntry[] {
  const out: SetEntry[] = [];
  for (const block of draft.exercises) {
    for (const set of block.sets) {
      const weight = Number.parseFloat(set.weight.replace(',', '.')) || 0;
      const reps = Number.parseInt(set.reps, 10) || 0;
      const distance = Number.parseFloat(set.distance.replace(',', '.')) || 0;
      if (reps <= 0 && distance <= 0) continue;
      out.push({ exerciseId: block.exerciseId, weight, reps, distanceM: distance || undefined });
    }
  }
  return out;
}

let keySeed = 0;
export const newKey = () => `k${Date.now().toString(36)}${(keySeed++).toString(36)}`;
