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
  | 'Full body'
  | 'Carries'
  | 'Cardio';

export const CATEGORIES: Category[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Core',
  'Olympic',
  'Full body',
  'Carries',
  'Cardio',
];

/** 3 = primary mover, 2 = secondary, 1 = stabiliser. */
export type MuscleWeights = Partial<Record<MuscleId, 3 | 2 | 1>>;

/**
 * How a set of this movement is counted.
 * - `reps`     weight × reps (the usual)
 * - `distance` weight × metres — carries, sleds, machines, rowing, gym cardio
 */
export type Measure = 'reps' | 'distance';

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
  /** Defaults to `reps`. Distance work logs metres instead of reps. */
  measure?: Measure;
};

const ex = (
  id: string,
  name: string,
  category: Category,
  equipment: Equipment,
  loadFactor: number,
  muscles: MuscleWeights,
  isUnilateral = false,
): ExerciseDef => ({ id, name, category, equipment, loadFactor, muscles, isUnilateral, measure: 'reps' });

/** A movement logged in metres instead of reps (carries, sleds, cardio). */
const exDist = (
  id: string,
  name: string,
  category: Category,
  equipment: Equipment,
  loadFactor: number,
  muscles: MuscleWeights,
  isUnilateral = false,
): ExerciseDef => ({
  id,
  name,
  category,
  equipment,
  loadFactor,
  muscles,
  isUnilateral,
  measure: 'distance',
});

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
  exDist('farmer-carry', "Farmer's Carry", 'Carries', 'dumbbell', 2, { forearms: 3, traps: 2, abs: 2, obliques: 1 }),

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
  exDist('sled-push', 'Sled Push', 'Carries', 'other', 1, { quads: 3, glutes: 3, calves: 2, hamstrings: 1 }),
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
  exDist('suitcase-carry', 'Suitcase Carry', 'Carries', 'dumbbell', 1, { obliques: 3, abs: 2, forearms: 2, traps: 1 }, true),
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


  // -------------------------------------------------------------- carries
  exDist('overhead-carry', 'Overhead Carry (single arm)', 'Carries', 'dumbbell', 1, { front_delt: 3, side_delt: 2, traps: 2, obliques: 2, forearms: 1 }, true),
  exDist('front-rack-carry', 'Front Rack Carry', 'Carries', 'kettlebell', 2, { front_delt: 3, abs: 2, traps: 1, quads: 1 }),
  exDist('yoke-walk', 'Yoke Walk', 'Carries', 'other', 1, { traps: 3, quads: 2, glutes: 2, abs: 2, lower_back: 1 }),
  exDist('sandbag-carry', 'Sandbag Carry', 'Carries', 'other', 2, { forearms: 2, abs: 2, traps: 2, quads: 2, glutes: 1 }),
  exDist('bear-hug-carry', 'Bear Hug Carry', 'Carries', 'other', 1, { abs: 2, forearms: 2, quads: 2, chest: 2, glutes: 1 }),
  exDist('sled-drag', 'Sled Drag', 'Carries', 'other', 1, { hamstrings: 3, glutes: 2, calves: 2, quads: 1 }),
  exDist('sled-rope-pull', 'Sled Rope Pull', 'Carries', 'other', 1, { lats: 3, quads: 2, glutes: 2, forearms: 2 }),

  // --------------------------------------------------------------- cardio
  exDist('rower', 'Rowing Machine', 'Cardio', 'machine', 0, { quads: 3, glutes: 2, lats: 2, mid_back: 1, hamstrings: 1, biceps: 1, abs: 1 }),
  exDist('ski-erg', 'Ski Erg', 'Cardio', 'machine', 0, { lats: 3, triceps: 2, abs: 2, obliques: 1, quads: 1 }),
  exDist('treadmill-run', 'Treadmill Run', 'Cardio', 'machine', 0, { quads: 3, glutes: 2, hamstrings: 2, calves: 2, abs: 1 }),
  exDist('treadmill-incline-walk', 'Incline Treadmill Walk', 'Cardio', 'machine', 0, { glutes: 3, hamstrings: 2, calves: 2, quads: 1 }),
  exDist('stair-climber', 'Stair Climber', 'Cardio', 'machine', 0, { quads: 3, glutes: 3, calves: 2 }),
  exDist('stationary-bike', 'Stationary Bike', 'Cardio', 'machine', 0, { quads: 3, glutes: 2, hamstrings: 1, calves: 1 }),
  exDist('assault-bike', 'Assault Bike', 'Cardio', 'machine', 0, { quads: 2, glutes: 2, abs: 1, front_delt: 1, triceps: 1, biceps: 1 }),
  exDist('elliptical', 'Elliptical', 'Cardio', 'machine', 0, { quads: 2, glutes: 2, hamstrings: 1, calves: 1 }),
  ex('jump-rope', 'Jump Rope', 'Cardio', 'other', 0, { calves: 3, quads: 1, front_delt: 1 }),

  // ------------------------------------------------- chest, back, shoulders
  ex('dumbbell-pullover', 'Dumbbell Pullover', 'Chest', 'dumbbell', 2, { chest: 3, lats: 2, triceps: 1 }),
  ex('incline-fly', 'Incline Dumbbell Fly', 'Chest', 'dumbbell', 2, { chest: 3, front_delt: 2 }),
  ex('low-cable-fly', 'Low-to-High Cable Fly', 'Chest', 'cable', 1, { chest: 3, front_delt: 2 }),
  ex('svend-press', 'Svend Press', 'Chest', 'other', 1, { chest: 3, front_delt: 1 }),
  ex('landmine-chest-press', 'Landmine Chest Press', 'Chest', 'barbell', 1, { chest: 3, front_delt: 2, triceps: 1 }),
  ex('chest-supported-row', 'Chest-Supported Row', 'Back', 'machine', 1, { mid_back: 3, lats: 2, biceps: 1, rear_delt: 1 }),
  ex('seal-row', 'Seal Row', 'Back', 'barbell', 1, { mid_back: 3, lats: 2, biceps: 2 }),
  ex('meadows-row', 'Meadows Row', 'Back', 'barbell', 1, { lats: 3, mid_back: 2, biceps: 1, rear_delt: 1 }, true),
  ex('pendlay-row', 'Pendlay Row', 'Back', 'barbell', 1, { mid_back: 3, lats: 2, biceps: 1, traps: 1 }),
  ex('kroc-row', 'Kroc Row', 'Back', 'dumbbell', 1, { lats: 3, mid_back: 2, biceps: 2, traps: 1, forearms: 1 }, true),
  ex('single-arm-lat-pulldown', 'Single-Arm Lat Pulldown', 'Back', 'cable', 1, { lats: 3, biceps: 1, obliques: 1 }, true),
  ex('cable-pullover', 'Cable Pullover', 'Back', 'cable', 1, { lats: 3, chest: 2, triceps: 1 }),
  ex('machine-pullover', 'Machine Pullover', 'Back', 'machine', 1, { lats: 3, mid_back: 1, chest: 1 }),
  ex('cable-rear-delt-fly', 'Cable Rear Delt Fly', 'Shoulders', 'cable', 1, { rear_delt: 3, mid_back: 1 }, true),
  ex('bent-over-lateral-raise', 'Bent-Over Lateral Raise', 'Shoulders', 'dumbbell', 2, { rear_delt: 3, traps: 1, mid_back: 1 }),
  ex('z-press', 'Z Press', 'Shoulders', 'barbell', 1, { front_delt: 3, side_delt: 2, triceps: 2, abs: 2 }),
  ex('seated-barbell-press', 'Seated Barbell Press', 'Shoulders', 'barbell', 1, { front_delt: 3, side_delt: 2, triceps: 2 }),

  // ------------------------------------------------------------------ arms
  ex('jm-press', 'JM Press', 'Arms', 'barbell', 1, { triceps: 3, chest: 2, front_delt: 1 }),
  ex('cable-overhead-triceps-extension', 'Cable Overhead Extension', 'Arms', 'cable', 1, { triceps: 3 }),
  ex('reverse-grip-pushdown', 'Reverse-Grip Pushdown', 'Arms', 'cable', 1, { triceps: 3, forearms: 1 }),
  ex('zottman-curl', 'Zottman Curl', 'Arms', 'dumbbell', 2, { biceps: 3, forearms: 2 }),
  ex('spider-curl', 'Spider Curl', 'Arms', 'dumbbell', 2, { biceps: 3, forearms: 1 }),
  ex('drag-curl', 'Drag Curl', 'Arms', 'barbell', 1, { biceps: 3, front_delt: 1 }),

  // ------------------------------------------------------------------ legs
  ex('belt-squat', 'Belt Squat', 'Legs', 'machine', 1, { quads: 3, glutes: 2, adductors: 1 }),
  ex('pendulum-squat', 'Pendulum Squat', 'Legs', 'machine', 1, { quads: 3, glutes: 2 }),
  ex('reverse-lunge', 'Reverse Lunge', 'Legs', 'dumbbell', 2, { quads: 3, glutes: 2, hamstrings: 1, adductors: 1 }, true),
  ex('curtsy-lunge', 'Curtsy Lunge', 'Legs', 'dumbbell', 2, { glutes: 3, adductors: 2, quads: 2 }, true),
  ex('cossack-squat', 'Cossack Squat', 'Legs', 'bodyweight', 0, { adductors: 3, quads: 2, glutes: 2 }, true),
  ex('nordic-curl', 'Nordic Hamstring Curl', 'Legs', 'bodyweight', 0, { hamstrings: 3, glutes: 1, calves: 1 }),
  ex('glute-ham-raise', 'Glute-Ham Raise', 'Legs', 'machine', 0, { hamstrings: 3, glutes: 2, calves: 1 }),
  ex('single-leg-rdl', 'Single-Leg RDL', 'Legs', 'dumbbell', 1, { hamstrings: 3, glutes: 2, lower_back: 1, obliques: 1 }, true),
  ex('b-stance-rdl', 'B-Stance RDL', 'Legs', 'dumbbell', 2, { hamstrings: 3, glutes: 2, lower_back: 1 }, true),
  ex('cable-pull-through', 'Cable Pull-Through', 'Legs', 'cable', 1, { glutes: 3, hamstrings: 2, lower_back: 1 }),
  ex('tibialis-raise', 'Tibialis Raise', 'Legs', 'bodyweight', 0, { calves: 3 }),
  ex('donkey-calf-raise', 'Donkey Calf Raise', 'Legs', 'machine', 1, { calves: 3 }),

  // --------------------------------------------------------------- olympic
  ex('hang-clean', 'Hang Clean', 'Olympic', 'barbell', 1, { quads: 3, traps: 2, glutes: 2, hamstrings: 2, lower_back: 1 }),
  ex('hang-snatch', 'Hang Snatch', 'Olympic', 'barbell', 1, { traps: 3, quads: 2, glutes: 2, hamstrings: 2, lower_back: 1 }),
  ex('power-snatch', 'Power Snatch', 'Olympic', 'barbell', 1, { traps: 3, quads: 2, glutes: 2, hamstrings: 1 }),
  ex('push-jerk', 'Push Jerk', 'Olympic', 'barbell', 1, { front_delt: 3, triceps: 2, quads: 2, abs: 1 }),
  ex('split-jerk', 'Split Jerk', 'Olympic', 'barbell', 1, { front_delt: 3, triceps: 2, quads: 2, glutes: 2, abs: 1 }),
  ex('clean-pull', 'Clean Pull', 'Olympic', 'barbell', 1, { traps: 3, hamstrings: 3, glutes: 2, lower_back: 2, quads: 1 }),
  ex('snatch-pull', 'Snatch Pull', 'Olympic', 'barbell', 1, { traps: 3, hamstrings: 2, glutes: 2, lower_back: 2 }),
  ex('overhead-squat', 'Overhead Squat', 'Olympic', 'barbell', 1, { quads: 3, abs: 3, glutes: 2, traps: 2, lower_back: 1 }),

  // ------------------------------------------------------------------ core
  ex('copenhagen-plank', 'Copenhagen Plank', 'Core', 'bodyweight', 0, { adductors: 3, obliques: 2, abs: 2 }, true),
  ex('hollow-hold', 'Hollow Body Hold', 'Core', 'bodyweight', 0, { abs: 3, obliques: 2, quads: 1 }),
  ex('l-sit', 'L-Sit', 'Core', 'bodyweight', 0, { abs: 3, quads: 2, forearms: 1 }),
  ex('dragon-flag', 'Dragon Flag', 'Core', 'bodyweight', 0, { abs: 3, obliques: 2, lats: 1 }),
  ex('hanging-windshield-wiper', 'Hanging Windshield Wiper', 'Core', 'bodyweight', 0, { obliques: 3, abs: 3, forearms: 1 }),
  ex('cable-side-bend', 'Cable Side Bend', 'Core', 'cable', 1, { obliques: 3, abs: 1 }, true),
  ex('plank-shoulder-tap', 'Plank Shoulder Tap', 'Core', 'bodyweight', 0, { abs: 3, obliques: 2, front_delt: 1 }),
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
