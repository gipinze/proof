// Parses the TrainHeroic clone's exercise-e enrichment SQL into JSON and
// compares its muscle vocabulary against this app's catalog.
//
//   node scripts/compare-muscles.cjs
const fs = require('fs');
const path = require('path');

// point this at the sibling audit dump if you want to re-run the comparison
const SQL = process.env.EXERCISE_SQL ?? '../TrainHeroic clone/exercise-enrichment.sql';
const raw = fs.readFileSync(SQL, 'utf8');

const lines = raw.split(/\r?\n/);
const rows = new Map();

const arr = (s) =>
  s
    .split(',')
    .map((x) => x.trim().replace(/^'+|'+$/g, ''))
    .filter(Boolean);

for (const line of lines) {
  const slug = /where slug = '([^']+)'/.exec(line);
  if (!slug) continue;
  const id = slug[1];
  const primary = /worked_muscles = coalesce\(worked_muscles, array\[([^\]]*)\]/.exec(line);
  const secondary = /secondary_muscles = coalesce\(secondary_muscles, array\[([^\]]*)\]/.exec(line);
  const group = /muscle_group = coalesce\(muscle_group, '([^']*)'\)/.exec(line);
  const equip = /equipment = coalesce\(equipment, '([^']*)'\)/.exec(line);

  const prev = rows.get(id) || { slug: id };
  rows.set(id, {
    ...prev,
    primary: primary ? arr(primary[1]) : prev.primary,
    secondary: secondary ? arr(secondary[1]) : prev.secondary,
    muscle_group: group ? group[1] : prev.muscle_group,
    equipment: equip ? equip[1] : prev.equipment,
  });
}

const data = [...rows.values()];

// ---- vocabulary
const vocab = new Map();
for (const row of data) {
  for (const m of row.primary || []) vocab.set(m.toLowerCase(), (vocab.get(m.toLowerCase()) || 0) + 1);
}
const sorted = [...vocab.entries()].sort((a, b) => b[1] - a[1]);

console.log(`parsed exercises: ${data.length}`);
console.log(`with primary muscles: ${data.filter((d) => d.primary && d.primary.length).length}`);
console.log(`\nmuscle vocabulary (${sorted.length}):`);
for (const [m, n] of sorted) console.log(`  ${m.padEnd(18)} ${n}`);

// ---- compare against our catalog
const ts = fs.readFileSync(path.join(process.cwd(), 'src/data/exercises.ts'), 'utf8');
const ours = [...ts.matchAll(/ex\('([^']+)', '([^']+)'/g)].map((m) => ({ id: m[1], name: m[2] }));

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(barbell|dumbbell|db|bb|cable|machine|smith|the|with)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const byName = new Map();
for (const row of data) {
  byName.set(norm(row.slug.replace(/-/g, ' ')), row);
}

let matched = 0;
const missing = [];
for (const o of ours) {
  const key = norm(o.name);
  let hit = byName.get(key);
  if (!hit) {
    // try a looser contains match on the longest word sequence
    for (const [k, v] of byName) {
      if (k === key || (key.length > 8 && (k.includes(key) || key.includes(k)))) {
        hit = v;
        break;
      }
    }
  }
  if (hit && hit.primary && hit.primary.length) matched++;
  else missing.push(o.name);
}

console.log(`\nour catalog: ${ours.length}`);
console.log(`matched with muscle data: ${matched}`);
console.log(`unmatched: ${missing.length}`);
if (missing.length) console.log('  ' + missing.slice(0, 40).join('\n  '));

fs.mkdirSync(path.join(process.cwd(), '.cache'), { recursive: true });
fs.writeFileSync(
  path.join(process.cwd(), '.cache', 'reference-muscles.json'),
  JSON.stringify(data, null, 1),
);
console.log('\nwrote .cache/reference-muscles.json');
