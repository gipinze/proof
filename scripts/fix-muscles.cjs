// One-off: small muscle-mapping corrections on the catalog.
//   node scripts/fix-muscles.cjs
const fs = require('fs');
const path = require('path');

const FILE = path.join(process.cwd(), 'src', 'data', 'exercises.ts');
let src = fs.readFileSync(FILE, 'utf8');

const edits = [
  // conventional deadlift: quads do drive the first third off the floor
  [
    "ex('deadlift', 'Deadlift', 'Back', 'barbell', 1, { hamstrings: 3, glutes: 3, lower_back: 2, lats: 2, traps: 2, forearms: 1 })",
    "ex('deadlift', 'Deadlift', 'Back', 'barbell', 1, { hamstrings: 3, glutes: 3, lower_back: 2, lats: 2, traps: 2, quads: 1, forearms: 1 })",
  ],
  // pressing overhead loads the upper traps to rotate the scapula
  [
    "ex('overhead-press', 'Overhead Press', 'Shoulders', 'barbell', 1, { front_delt: 3, side_delt: 2, triceps: 2, abs: 1 })",
    "ex('overhead-press', 'Overhead Press', 'Shoulders', 'barbell', 1, { front_delt: 3, side_delt: 2, triceps: 2, traps: 1, abs: 1 })",
  ],
  // a pec deck still asks the anterior delt to keep the arm in the movement
  [
    "ex('pec-deck', 'Pec Deck', 'Chest', 'machine', 1, { chest: 3 })",
    "ex('pec-deck', 'Pec Deck', 'Chest', 'machine', 1, { chest: 3, front_delt: 1 })",
  ],
  [
    "ex('decline-bench', 'Decline Bench Press', 'Chest', 'barbell', 1, { chest: 3, triceps: 2 })",
    "ex('decline-bench', 'Decline Bench Press', 'Chest', 'barbell', 1, { chest: 3, triceps: 2, front_delt: 1 })",
  ],
  // rows: the upper traps and trunk hold position
  [
    "ex('barbell-row', 'Barbell Row', 'Back', 'barbell', 1, { lats: 3, mid_back: 2, biceps: 2, rear_delt: 1, lower_back: 1 })",
    "ex('barbell-row', 'Barbell Row', 'Back', 'barbell', 1, { lats: 3, mid_back: 2, biceps: 2, rear_delt: 1, traps: 1, abs: 1, lower_back: 1 })",
  ],
  [
    "ex('pull-up', 'Pull-Up', 'Back', 'bodyweight', 0, { lats: 3, biceps: 2, mid_back: 2, forearms: 1 })",
    "ex('pull-up', 'Pull-Up', 'Back', 'bodyweight', 0, { lats: 3, biceps: 2, mid_back: 2, traps: 1, forearms: 1 })",
  ],
  // grip endurance on a hang is not a primary forearm movement
  [
    "ex('hanging-leg-raise', 'Hanging Leg Raise', 'Core', 'bodyweight', 0, { abs: 3, obliques: 2, forearms: 2 })",
    "ex('hanging-leg-raise', 'Hanging Leg Raise', 'Core', 'bodyweight', 0, { abs: 3, obliques: 2, forearms: 1 })",
  ],
  [
    "ex('toes-to-bar', 'Toes to Bar', 'Core', 'bodyweight', 0, { abs: 3, obliques: 2, forearms: 1 })",
    "ex('toes-to-bar', 'Toes to Bar', 'Core', 'bodyweight', 0, { abs: 3, obliques: 2, lats: 1, forearms: 1 })",
  ],
  // a vertical press with a barbell always asks for some upper-chest help
  [
    "ex('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'Shoulders', 'dumbbell', 2, { front_delt: 3, side_delt: 2, triceps: 1 })",
    "ex('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'Shoulders', 'dumbbell', 2, { front_delt: 3, side_delt: 2, triceps: 1, traps: 1 })",
  ],
];

let applied = 0;
for (const [from, to] of edits) {
  if (src.includes(from)) {
    src = src.replace(from, to);
    applied++;
  } else {
    console.log('NOT FOUND:', from.slice(0, 70));
  }
}

fs.writeFileSync(FILE, src);
console.log(`applied ${applied}/${edits.length}`);
