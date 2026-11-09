/** The muscle groups this app knows about. */
export type MuscleId =
  | 'chest'
  | 'front_delt'
  | 'side_delt'
  | 'rear_delt'
  | 'traps'
  | 'lats'
  | 'mid_back'
  | 'lower_back'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'glutes'
  | 'quads'
  | 'adductors'
  | 'hamstrings'
  | 'calves';

export type MuscleGroup = {
  id: MuscleId;
  name: string;
  /** Which body view shows it prominently. */
  view: 'front' | 'back' | 'both';
};

export const MUSCLES: MuscleGroup[] = [
  { id: 'chest', name: 'Chest', view: 'front' },
  { id: 'front_delt', name: 'Front delts', view: 'front' },
  { id: 'side_delt', name: 'Side delts', view: 'front' },
  { id: 'rear_delt', name: 'Rear delts', view: 'back' },
  { id: 'traps', name: 'Traps', view: 'both' },
  { id: 'lats', name: 'Lats', view: 'back' },
  { id: 'mid_back', name: 'Mid back', view: 'back' },
  { id: 'lower_back', name: 'Lower back', view: 'back' },
  { id: 'biceps', name: 'Biceps', view: 'front' },
  { id: 'triceps', name: 'Triceps', view: 'both' },
  { id: 'forearms', name: 'Forearms', view: 'both' },
  { id: 'abs', name: 'Abs', view: 'front' },
  { id: 'obliques', name: 'Obliques', view: 'front' },
  { id: 'glutes', name: 'Glutes', view: 'back' },
  { id: 'quads', name: 'Quads', view: 'front' },
  { id: 'adductors', name: 'Adductors', view: 'both' },
  { id: 'hamstrings', name: 'Hamstrings', view: 'back' },
  { id: 'calves', name: 'Calves', view: 'both' },
];

export const MUSCLE_NAME: Record<MuscleId, string> = MUSCLES.reduce(
  (acc, m) => ({ ...acc, [m.id]: m.name }),
  {} as Record<MuscleId, string>,
);

/** Human-readable list, used on cards ("Chest · Triceps · Front delts"). */
export function muscleNames(ids: MuscleId[], max = 3): string {
  const names = ids.slice(0, max).map((id) => MUSCLE_NAME[id]);
  if (ids.length > max) names.push(`+${ids.length - max}`);
  return names.join(' · ');
}
