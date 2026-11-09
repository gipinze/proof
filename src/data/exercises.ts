import type { MuscleId } from './anatomy';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';

export type Category =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Arms'
  | 'Legs'
  | 'Core'
  | 'Olympic'
  | 'Full body';

export const CATEGORIES: Category[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Core',
  'Olympic',
  'Full body',
];

/** 3 = primary mover, 2 = secondary, 1 = stabiliser. */
export type MuscleWeights = Partial<Record<MuscleId, 3 | 2 | 1>>;

export type ExerciseDef = {
  id: string;
  name: string;
  category: Category;
  equipment: Equipment;
  /**
   * Multiplier from "weight typed by the user" to "total external load".
   * 2 for dumbbell work (two dumbbells), 1 for barbell/machine/stack,
   * 0 for bodyweight-only movements.
   */
  loadFactor: number;
  /** One arm / one leg at a time — weight stays single-sided. */
  isUnilateral?: boolean;
  muscles: MuscleWeights;
};

const ex = (
  id: string,
  name: string,
  category: Category,
  equipment: Equipment,
  loadFactor: number,
  muscles: MuscleWeights,
  isUnilateral = false,
): ExerciseDef => ({ id, name, category, equipment, loadFactor, muscles, isUnilateral });

export const EXERCISES: ExerciseDef[] = [
  // ---------------------------------------------------------------- chest
  ex('barbell-bench', 'Barbell Bench Press', 'Chest', 'barbell', 1, { chest: 3, triceps: 1, front_delt: 1 }),
  ex('incline-barbell-bench', 'Incline Barbell Bench', 'Chest', 'barbell', 1, { chest: 3, front_delt: 2, triceps: 1 }),
  ex('decline-bench', 'Decline Bench Press', 'Chest', 'barbell', 1, { chest: 3, triceps: 2, front_delt: 1 }),
  ex('dumbbell-bench', 'Dumbbell Bench Press', 'Chest', 'dumbbell', 2, { chest: 3, triceps: 1, front_delt: 1 }),
  ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'Chest', 'dumbbell', 2, { chest: 3, front_delt: 2, triceps: 1 }),
  ex('dumbbell-fly', 'Dumbbell Fly', 'Chest', 'dumbbell', 2, { chest: 3, front_delt: 1 }),
  ex('cable-fly', 'Cable Fly', 'Chest', 'cable', 1, { chest: 3, front_delt: 1 }),
  ex('pec-deck', 'Pec Deck', 'Chest', 'machine', 1, { chest: 3, front_delt: 1 }),
  ex('machine-chest-press', 'Machine Chest Press', 'Chest', 'machine', 1, { chest: 3, triceps: 1, front_delt: 1 }),
  ex('pushup', 'Push-Up', 'Chest', 'bodyweight', 0, { chest: 3, triceps: 2, front_delt: 1, abs: 1 }),
  ex('dips-chest', 'Dips (chest lean)', 'Chest', 'bodyweight', 0, { chest: 3, triceps: 2, front_delt: 1 }),

  // ----------------------------------------------------------------- back
  ex('deadlift', 'Deadlift', 'Back', 'barbell', 1, { hamstrings: 3, glutes: 3, lower_back: 2, lats: 2, traps: 2, quads: 1, forearms: 1 }),
  ex('rack-pull', 'Rack Pull', 'Back', 'barbell', 1, { traps: 3, lats: 2, lower_back: 2, glutes: 1, forearms: 1 }),
  ex('barbell-row', 'Barbell Row', 'Back', 'barbell', 1, { lats: 3, mid_back: 2, biceps: 2, rear_delt: 1, traps: 1, abs: 1, lower_back: 1 }),
  ex('t-bar-row', 'T-Bar Row', 'Back', 'barbell', 1, { lats: 3, mid_back: 2, biceps: 1, traps: 1 }),
  ex('dumbbell-row', 'Dumbbell Row', 'Back', 'dumbbell', 1, { lats: 3, mid_back: 2, biceps: 2, rear_delt: 1 }, true),
  ex('lat-pulldown', 'Lat Pulldown', 'Back', 'cable', 1, { lats: 3, biceps: 2, mid_back: 1 }),
  ex('pull-up', 'Pull-Up', 'Back', 'bodyweight', 0, { lats: 3, biceps: 2, mid_back: 2, traps: 1, forearms: 1 }),
  ex('chin-up', 'Chin-Up', 'Back', 'bodyweight', 0, { lats: 3, biceps: 3, mid_back: 1 }),
  ex('seated-cable-row', 'Seated Cable Row', 'Back', 'cable', 1, { mid_back: 3, lats: 2, biceps: 2, rear_delt: 1 }),
  ex('machine-row', 'Machine Row', 'Back', 'machine', 1, { mid_back: 3, lats: 2, biceps: 1 }),
  ex('straight-arm-pulldown', 'Straight-Arm Pulldown', 'Back', 'cable', 1, { lats: 3, mid_back: 1 }),
  ex('inverted-row', 'Inverted Row', 'Back', 'bodyweight', 0, { lats: 2, mid_back: 2, biceps: 2, rear_delt: 1 }),
  ex('back-extension', 'Back Extension', 'Back', 'bodyweight', 0, { lower_back: 3, glutes: 2, hamstrings: 2 }),
  ex('good-morning', 'Good Morning', 'Back', 'barbell', 1, { hamstrings: 3, lower_back: 3, glutes: 2 }),
  ex('shrug', 'Barbell Shrug', 'Back', 'barbell', 1, { traps: 3, forearms: 1 }),

  // ------------------------------------------------------------ shoulders
  ex('overhead-press', 'Overhead Press', 'Shoulders', 'barbell', 1, { front_delt: 3, side_delt: 2, triceps: 2, traps: 1, abs: 1 }),
  ex('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'Shoulders', 'dumbbell', 2, { front_delt: 3, side_delt: 2, triceps: 1, traps: 1 }),
  ex('arnold-press', 'Arnold Press', 'Shoulders', 'dumbbell', 2, { front_delt: 3, side_delt: 2, triceps: 1 }),
  ex('machine-shoulder-press', 'Machine Shoulder Press', 'Shoulders', 'machine', 1, { front_delt: 3, side_delt: 2, triceps: 1 }),
  ex('landmine-press', 'Landmine Press', 'Shoulders', 'barbell', 1, { front_delt: 3, chest: 1, triceps: 1, obliques: 1 }, true),
  ex('lateral-raise', 'Lateral Raise', 'Shoulders', 'dumbbell', 2, { side_delt: 3, front_delt: 1, traps: 1 }),
  ex('cable-lateral-raise', 'Cable Lateral Raise', 'Shoulders', 'cable', 1, { side_delt: 3, traps: 1 }, true),
  ex('front-raise', 'Front Raise', 'Shoulders', 'dumbbell', 2, { front_delt: 3, side_delt: 1 }),
  ex('rear-delt-fly', 'Rear Delt Fly', 'Shoulders', 'dumbbell', 2, { rear_delt: 3, mid_back: 2, traps: 1 }),
  ex('reverse-pec-deck', 'Reverse Pec Deck', 'Shoulders', 'machine', 1, { rear_delt: 3, mid_back: 1 }),
  ex('face-pull', 'Face Pull', 'Shoulders', 'cable', 1, { rear_delt: 3, traps: 2, mid_back: 1 }),
  ex('upright-row', 'Upright Row', 'Shoulders', 'barbell', 1, { traps: 2, side_delt: 2, front_delt: 1, biceps: 1 }),

  // ----------------------------------------------------------------- arms
  ex('barbell-curl', 'Barbell Curl', 'Arms', 'barbell', 1, { biceps: 3, forearms: 2 }),
  ex('dumbbell-curl', 'Dumbbell Curl', 'Arms', 'dumbbell', 2, { biceps: 3, forearms: 2 }),
  ex('hammer-curl', 'Hammer Curl', 'Arms', 'dumbbell', 2, { biceps: 2, forearms: 3 }),
  ex('preacher-curl', 'Preacher Curl', 'Arms', 'machine', 1, { biceps: 3, forearms: 1 }),
  ex('cable-curl', 'Cable Curl', 'Arms', 'cable', 1, { biceps: 3, forearms: 1 }),
  ex('incline-dumbbell-curl', 'Incline Dumbbell Curl', 'Arms', 'dumbbell', 2, { biceps: 3, forearms: 1 }),
  ex('concentration-curl', 'Concentration Curl', 'Arms', 'dumbbell', 1, { biceps: 3 }, true),
  ex('reverse-curl', 'Reverse Curl', 'Arms', 'barbell', 1, { forearms: 3, biceps: 2 }),
  ex('wrist-curl', 'Wrist Curl', 'Arms', 'dumbbell', 2, { forearms: 3 }),
  ex('close-grip-bench', 'Close-Grip Bench', 'Arms', 'barbell', 1, { triceps: 3, chest: 2, front_delt: 1 }),
  ex('triceps-pushdown', 'Triceps Pushdown', 'Arms', 'cable', 1, { triceps: 3, forearms: 1 }),
  ex('overhead-triceps-extension', 'Overhead Triceps Extension', 'Arms', 'cable', 1, { triceps: 3 }),
  ex('skull-crusher', 'Skull Crusher', 'Arms', 'barbell', 1, { triceps: 3, chest: 1 }),
  ex('dips-triceps', 'Dips (upright)', 'Arms', 'bodyweight', 0, { triceps: 3, chest: 2, front_delt: 1 }),
  ex('bench-dips', 'Bench Dips', 'Arms', 'bodyweight', 0, { triceps: 3, chest: 1, front_delt: 1 }),
  ex('kickback', 'Triceps Kickback', 'Arms', 'dumbbell', 1, { triceps: 3 }, true),
  ex('farmer-carry', "Farmer's Carry", 'Arms', 'dumbbell', 2, { forearms: 3, traps: 2, abs: 2, obliques: 1 }),

  // ----------------------------------------------------------------- legs
  ex('back-squat', 'Back Squat', 'Legs', 'barbell', 1, { quads: 3, glutes: 3, adductors: 2, lower_back: 2, abs: 1 }),
  ex('front-squat', 'Front Squat', 'Legs', 'barbell', 1, { quads: 3, glutes: 2, abs: 2, lower_back: 1 }),
  ex('hack-squat', 'Hack Squat', 'Legs', 'machine', 1, { quads: 3, glutes: 2 }),
  ex('leg-press', 'Leg Press', 'Legs', 'machine', 1, { quads: 3, glutes: 2, hamstrings: 1 }),
  ex('smith-squat', 'Smith Machine Squat', 'Legs', 'machine', 1, { quads: 3, glutes: 2 }),
  ex('goblet-squat', 'Goblet Squat', 'Legs', 'kettlebell', 1, { quads: 3, glutes: 2, abs: 2 }),
  ex('bulgarian-split-squat', 'Bulgarian Split Squat', 'Legs', 'dumbbell', 2, { quads: 3, glutes: 3, adductors: 1, hamstrings: 1 }, true),
  ex('lunge', 'Walking Lunge', 'Legs', 'dumbbell', 2, { quads: 3, glutes: 2, hamstrings: 1, adductors: 1 }, true),
  ex('step-up', 'Step-Up', 'Legs', 'dumbbell', 2, { quads: 3, glutes: 3, hamstrings: 1 }, true),
  ex('leg-extension', 'Leg Extension', 'Legs', 'machine', 1, { quads: 3 }),
  ex('leg-curl', 'Leg Curl', 'Legs', 'machine', 1, { hamstrings: 3, calves: 1 }),
  ex('romanian-deadlift', 'Romanian Deadlift', 'Legs', 'barbell', 1, { hamstrings: 3, glutes: 3, lower_back: 2, forearms: 1 }),
  ex('stiff-leg-deadlift', 'Stiff-Leg Deadlift', 'Legs', 'barbell', 1, { hamstrings: 3, glutes: 2, lower_back: 2 }),
  ex('sumo-deadlift', 'Sumo Deadlift', 'Legs', 'barbell', 1, { adductors: 3, glutes: 3, quads: 2, hamstrings: 2, lower_back: 2 }),
  ex('hip-thrust', 'Hip Thrust', 'Legs', 'barbell', 1, { glutes: 3, hamstrings: 2, quads: 1, abs: 1 }),
  ex('glute-bridge', 'Glute Bridge', 'Legs', 'bodyweight', 0, { glutes: 3, hamstrings: 2 }),
  ex('glute-kickback', 'Cable Glute Kickback', 'Legs', 'cable', 1, { glutes: 3, hamstrings: 1 }, true),
  ex('hip-abduction', 'Hip Abduction', 'Legs', 'machine', 1, { glutes: 3 }),
  ex('adductor-machine', 'Adductor Machine', 'Legs', 'machine', 1, { adductors: 3 }),
  ex('standing-calf-raise', 'Standing Calf Raise', 'Legs', 'machine', 1, { calves: 3 }),
  ex('seated-calf-raise', 'Seated Calf Raise', 'Legs', 'machine', 1, { calves: 3 }),
  ex('smith-calf-raise', 'Smith Calf Raise', 'Legs', 'machine', 1, { calves: 3 }),
  ex('sissy-squat', 'Sissy Squat', 'Legs', 'bodyweight', 0, { quads: 3, abs: 1 }),
  ex('kettlebell-swing', 'Kettlebell Swing', 'Legs', 'kettlebell', 1, { glutes: 3, hamstrings: 2, lower_back: 2, abs: 1, traps: 1 }),
  ex('sled-push', 'Sled Push', 'Legs', 'other', 1, { quads: 3, glutes: 2, calves: 2 }),
  ex('trap-bar-deadlift', 'Trap Bar Deadlift', 'Legs', 'barbell', 1, { glutes: 3, quads: 2, traps: 2, lower_back: 2, forearms: 2 }),

  // ----------------------------------------------------------------- core
  ex('plank', 'Plank', 'Core', 'bodyweight', 0, { abs: 3, obliques: 2, front_delt: 1 }),
  ex('side-plank', 'Side Plank', 'Core', 'bodyweight', 0, { obliques: 3, abs: 2 }, true),
  ex('hanging-leg-raise', 'Hanging Leg Raise', 'Core', 'bodyweight', 0, { abs: 3, obliques: 2, forearms: 1 }),
  ex('cable-crunch', 'Cable Crunch', 'Core', 'cable', 1, { abs: 3, obliques: 1 }),
  ex('ab-wheel', 'Ab Wheel Rollout', 'Core', 'bodyweight', 0, { abs: 3, obliques: 2, lats: 1 }),
  ex('russian-twist', 'Russian Twist', 'Core', 'bodyweight', 0, { obliques: 3, abs: 2 }),
  ex('woodchopper', 'Cable Woodchopper', 'Core', 'cable', 1, { obliques: 3, abs: 2, front_delt: 1 }, true),
  ex('pallof-press', 'Pallof Press', 'Core', 'cable', 1, { obliques: 3, abs: 2 }, true),
  ex('dead-bug', 'Dead Bug', 'Core', 'bodyweight', 0, { abs: 3, obliques: 2 }),
  ex('suitcase-carry', 'Suitcase Carry', 'Core', 'dumbbell', 1, { obliques: 3, abs: 2, forearms: 2, traps: 1 }, true),
  ex('toes-to-bar', 'Toes to Bar', 'Core', 'bodyweight', 0, { abs: 3, obliques: 2, lats: 1, forearms: 1 }),

  // -------------------------------------------------------------- olympic
  ex('power-clean', 'Power Clean', 'Olympic', 'barbell', 1, { quads: 3, glutes: 3, traps: 2, hamstrings: 2, lower_back: 2, forearms: 2 }),
  ex('clean-and-jerk', 'Clean & Jerk', 'Olympic', 'barbell', 1, { quads: 3, glutes: 3, front_delt: 2, traps: 2, lower_back: 2 }),
  ex('snatch', 'Snatch', 'Olympic', 'barbell', 1, { quads: 3, traps: 3, glutes: 2, hamstrings: 2, lower_back: 2 }),
  ex('push-press', 'Push Press', 'Olympic', 'barbell', 1, { front_delt: 3, triceps: 2, quads: 2, abs: 1 }),
  ex('thruster', 'Thruster', 'Olympic', 'barbell', 1, { quads: 3, front_delt: 3, glutes: 2, triceps: 1 }),
  ex('high-pull', 'High Pull', 'Olympic', 'barbell', 1, { traps: 3, side_delt: 2, quads: 2, glutes: 1, forearms: 1 }),

  // ------------------------------------------------------------ full body
  ex('burpee', 'Burpee', 'Full body', 'bodyweight', 0, { quads: 2, glutes: 2, chest: 2, triceps: 1, abs: 1 }),
  ex('battle-ropes', 'Battle Ropes', 'Full body', 'other', 0, { front_delt: 2, side_delt: 2, abs: 2, forearms: 2 }),
  ex('wall-ball', 'Wall Ball', 'Full body', 'other', 1, { quads: 3, front_delt: 2, glutes: 2 }),
  ex('bear-crawl', 'Bear Crawl', 'Full body', 'bodyweight', 0, { abs: 2, front_delt: 2, quads: 2, triceps: 1 }),
];

export const EXERCISE_BY_ID: Record<string, ExerciseDef> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
);

export function getExercise(id: string): ExerciseDef {
  const found = EXERCISE_BY_ID[id];
  if (found) return found;
  return {
    id,
    name: id,
    category: 'Full body',
    equipment: 'other',
    loadFactor: 1,
    muscles: {},
  };
}

export function searchExercises(query: string, category?: Category | 'All'): ExerciseDef[] {
  const q = query.trim().toLowerCase();
  return EXERCISES.filter((e) => {
    if (category && category !== 'All' && e.category !== category) return false;
    if (!q) return true;
    return e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
  });
}

/** Muscles sorted by how hard this exercise hits them. */
export function musclesOfExercise(e: ExerciseDef): { id: MuscleId; weight: number }[] {
  return (Object.entries(e.muscles) as [MuscleId, number][])
    .map(([id, weight]) => ({ id, weight }))
    .sort((a, b) => b.weight - a.weight);
}
