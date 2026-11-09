// Audit: compare this app's exercise→muscle mapping against the TrainHeroic
// reference dataset, muscle by muscle, and print where they disagree.
//
//   node scripts/audit-muscles.cjs
const fs = require('fs');
const path = require('path');

const ref = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.cache', 'reference-muscles.json'), 'utf8'));
const ts = fs.readFileSync(path.join(process.cwd(), 'src/data/exercises.ts'), 'utf8');

// ---- our catalog, parsed out of the TS source
const ours = [];
for (const m of ts.matchAll(/ex\('([^']+)', '([^']+)', '([^']+)', '([^']+)', (\d), \{([^}]*)\}(, true)?\)/g)) {
  const muscles = {};
  for (const pair of m[6].split(',')) {
    const [k, v] = pair.split(':').map((s) => s.trim());
    if (k) muscles[k] = Number(v);
  }
  ours.push({ id: m[1], name: m[2], category: m[3], equipment: m[4], loadFactor: Number(m[5]), muscles, unilateral: !!m[7] });
}

// ---- vocabulary bridge
const MAP = {
  trapezius: ['traps'],
  quadriceps: ['quads'],
  'back-deltoids': ['rear_delt'],
  hamstring: ['hamstrings'],
  gluteal: ['glutes'],
  'front-deltoids': ['front_delt'],
  abs: ['abs'],
  'upper-back': ['lats', 'mid_back'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearm: ['forearms'],
  calves: ['calves'],
  obliques: ['obliques'],
  chest: ['chest'],
  'lower-back': ['lower_back'],
  adductor: ['adductors'],
  abductors: ['glutes'],
};

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(barbell|dumbbell|db|bb|cable|machine|smith|the|with)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const byName = new Map();
for (const row of ref) byName.set(norm(row.slug.replace(/-/g, ' ')), row);

function lookup(name) {
  const key = norm(name);
  let hit = byName.get(key);
  if (!hit) {
    for (const [k, v] of byName) {
      if ((key.length > 8 && k.includes(key)) || (k.length > 8 && key.includes(k))) {
        hit = v;
        break;
      }
    }
  }
  return hit;
}

const rows = [];
for (const o of ours) {
  const r = lookup(o.name);
  if (!r || !r.primary?.length) continue;

  const theirPrimary = new Set();
  for (const m of r.primary) for (const id of MAP[m.toLowerCase()] || []) theirPrimary.add(id);
  const theirSecondary = new Set();
  const SECONDARY_EXPAND = {
    back: ['lats', 'mid_back', 'traps', 'lower_back'],
    shoulders: ['front_delt', 'side_delt', 'rear_delt'],
    quads: ['quads'],
    glutes: ['glutes'],
    hamstrings: ['hamstrings'],
    calves: ['calves'],
    chest: ['chest'],
    triceps: ['triceps'],
    biceps: ['biceps'],
    core: ['abs', 'obliques'],
  };
  for (const m of r.secondary || []) {
    for (const id of SECONDARY_EXPAND[m.toLowerCase()] || []) theirSecondary.add(id);
  }

  const minePrimary = new Set(Object.entries(o.muscles).filter(([, v]) => v === 3).map(([k]) => k));
  const mineAll = new Set(Object.keys(o.muscles));

  const missedByMe = [...theirPrimary].filter((m) => !mineAll.has(m));
  const missedByThem = [...mineAll].filter((m) => !theirPrimary.has(m) && !theirSecondary.has(m));

  if (missedByMe.length || missedByThem.length) {
    rows.push({
      name: o.name,
      ref: r.primary.join(','),
      mine: Object.entries(o.muscles).map(([k, v]) => `${k}:${v}`).join(','),
      missedByMe,
      missedByThem,
      minePrimary,
    });
  }
}

console.log(`disagreements: ${rows.length} / ${ours.length}\n`);
for (const r of rows) {
  console.log(`▸ ${r.name}`);
  console.log(`   reference: ${r.ref}`);
  console.log(`   ours     : ${r.mine}`);
  if (r.missedByMe.length) console.log(`   they have, we MISS: ${r.missedByMe.join(', ')}`);
  if (r.missedByThem.length) console.log(`   we have, they MISS: ${r.missedByThem.join(', ')}`);
}
