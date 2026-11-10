import { test } from 'node:test';
import assert from 'node:assert/strict';
import { muscleLoad, normalisedLoad, rankedMuscles, setLoadDistance, setVolume, summarizeSets } from '../src/lib/volume';
import { getExercise } from '../src/data/exercises';

const bench = 'barbell-bench';
const dumbbellPress = 'incline-dumbbell-press';

test('volume uses loadFactor: barbell counts once, dumbbells twice', () => {
  assert.equal(getExercise(bench).loadFactor, 1);
  assert.equal(getExercise(dumbbellPress).loadFactor, 2);

  assert.equal(setVolume({ exerciseId: bench, weight: 100, reps: 5 }), 500);
  // 32 kg per hand is 64 kg of load
  assert.equal(setVolume({ exerciseId: dumbbellPress, weight: 32, reps: 10 }), 640);
});

test('bodyweight sets add volume but zero', () => {
  const pushUp = getExercise('pushup');
  assert.equal(pushUp.loadFactor, 0);
  assert.equal(setVolume({ exerciseId: 'pushup', weight: 0, reps: 20 }), 0);
});

test('distance work is measured in kg·m, not kg', () => {
  const carry = { exerciseId: 'farmer-carry', weight: 40, reps: 0, distanceM: 20 };
  assert.equal(setLoadDistance(carry), 1600); // 40 kg × 2 hands × 20 m
  assert.equal(setVolume(carry), 0);
});

test('summarizeSets totals volume, distance and timed distance separately', () => {
  const summary = summarizeSets([
    { exerciseId: bench, weight: 100, reps: 5 },
    { exerciseId: bench, weight: 100, reps: 5, isWarmup: true },
    { exerciseId: 'farmer-carry', weight: 40, reps: 0, distanceM: 20, durationS: 92 },
    { exerciseId: 'rower', weight: 0, reps: 0, distanceM: 500, durationS: 120 },
  ]);

  assert.equal(summary.volume, 500, 'warmups are excluded from volume');
  assert.equal(summary.sets, 3, 'warmups are excluded from the set count');
  assert.equal(summary.distanceM, 520);
  assert.equal(summary.loadDistance, 1600);
  assert.equal(summary.distanceTimeS, 212);
});

test('muscle load weights primary over secondary over stabiliser', () => {
  const load = muscleLoad([{ exerciseId: bench, weight: 100, reps: 5 }]);
  assert.equal(load.chest, 1, 'chest is the primary for bench');
  assert.equal(load.triceps, 0.16, 'triceps are a stabiliser here');
  assert.equal(load.front_delt, 0.16);
});

test('normalised load pins the hardest muscle to 1 and keeps the rest inside 0..1', () => {
  const load = normalisedLoad(muscleLoad([{ exerciseId: bench, weight: 100, reps: 5 }]));
  const values = Object.values(load);

  assert.equal(Math.max(...values), 1, 'the hardest-hit muscle is 1');
  for (const value of values) assert.ok(value > 0 && value <= 1);
  assert.ok(load.chest > load.triceps, 'primary still outranks stabiliser after normalising');
});

test('rankedMuscles returns ids ordered by load', () => {
  const load = muscleLoad([{ exerciseId: bench, weight: 100, reps: 5 }]);
  const ranked = rankedMuscles(load);

  assert.ok(ranked.length > 0);
  assert.equal(ranked[0], 'chest', 'bench leads with chest');
  for (let i = 1; i < ranked.length; i++) {
    const previous = load[ranked[i - 1]] ?? 0;
    const current = load[ranked[i]] ?? 0;
    assert.ok(previous >= current, 'ranking must not put a smaller load first');
  }
});
