import { test } from 'node:test';
import assert from 'node:assert/strict';
import { best1rm, estimate1rm, isPersonalRecord } from '../src/lib/pr';

test('Epley on a barbell set', () => {
  // 100 × 5 => 100 × (1 + 5/30) = 116.67
  assert.equal(Math.round(estimate1rm(100, 1, 5) * 100) / 100, 116.67);
});

test('dumbbells use the doubled load', () => {
  // 32 kg per hand × 10 reps, loadFactor 2 => 64 kg of load => 64 × (1 + 10/30)
  assert.equal(Math.round(estimate1rm(32, 2, 10) * 100) / 100, 85.33);
});

test('zero weight or reps is not a lift', () => {
  assert.equal(estimate1rm(0, 1, 5), 0);
  assert.equal(estimate1rm(100, 1, 0), 0);
});

test('a first-ever lift is not a PR', () => {
  assert.equal(isPersonalRecord(140, 0), false);
});

test('beating the previous best is a PR', () => {
  assert.equal(isPersonalRecord(140, 132), true);
});

test('matching the previous best is not a PR', () => {
  assert.equal(isPersonalRecord(132, 132), false);
});

test('a rounding-level improvement is not a PR', () => {
  assert.equal(isPersonalRecord(132.005, 132), false);
});

test('best1rm picks the heaviest estimate, not the heaviest weight', () => {
  // 120×5 => 140 beats 130×1 => 134.33
  const best = best1rm(
    [
      { weight: 120, reps: 5 },
      { weight: 130, reps: 1 },
      { weight: 90, reps: 12 },
    ],
    1,
  );
  assert.equal(Math.round(best * 100) / 100, 140);
});
