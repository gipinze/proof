import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeBackup, validateBackup } from '../src/lib/backup';

const good = {
  app: 'proof' as const,
  format: 1 as const,
  exportedAt: 1700000000000,
  settings: [{ key: 'athlete', value: 'Athlete' }],
  sessions: [
    {
      id: 1,
      kind: 'lift',
      title: 'Push A',
      started_at: 1700000000000,
      ended_at: 1700003600000,
      duration_s: 3600,
      distance_m: null,
      track: null,
      notes: null,
    },
  ],
  sets: [
    {
      id: 1,
      session_id: 1,
      exercise_id: 'barbell-bench',
      ordinal: 1,
      weight: 100,
      reps: 5,
      distance_m: null,
      duration_s: null,
      rpe: 8,
      note: 'felt heavy',
      is_warmup: 0,
    },
  ],
  templates: [],
};

test('a well-formed backup passes and is summarised', () => {
  const backup = validateBackup(JSON.parse(JSON.stringify(good)));
  assert.deepEqual(describeBackup(backup), { sessions: 1, sets: 1, templates: 0 });
});

test('a foreign JSON file is rejected by name', () => {
  assert.throws(() => validateBackup({ ...good, app: 'strava' }), /not exported by Proof/);
});

test('missing collections are rejected', () => {
  assert.throws(() => validateBackup({ app: 'proof' }), /missing its sessions or sets/);
});

test('an empty backup is refused rather than wiping the phone', () => {
  assert.throws(
    () => validateBackup({ ...good, sessions: [], sets: [] }),
    /contains no sessions/,
  );
});

test('malformed sessions and sets are caught', () => {
  assert.throws(
    () => validateBackup({ ...good, sessions: [{ id: 'one' }] }),
    /malformed session/,
  );
  assert.throws(
    () => validateBackup({ ...good, sets: [{ session_id: 1 }] }),
    /malformed set/,
  );
});

test('primitives are rejected', () => {
  assert.throws(() => validateBackup(null), /not a Proof backup/);
  assert.throws(() => validateBackup('{}'), /not a Proof backup/);
});
