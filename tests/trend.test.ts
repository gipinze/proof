import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekDeltaRatio } from '../src/lib/trend';

test('needs two weeks before it says anything', () => {
  assert.equal(weekDeltaRatio([]), null);
  assert.equal(weekDeltaRatio([{ volume: 5000 }]), null);
});

test('an empty week makes the change meaningless', () => {
  assert.equal(weekDeltaRatio([{ volume: 0 }, { volume: 5000 }]), null);
  assert.equal(weekDeltaRatio([{ volume: 5000 }, { volume: 0 }]), null);
});

test('doubling shows as +100%', () => {
  assert.equal(weekDeltaRatio([{ volume: 5000 }, { volume: 10000 }]), 1);
});

test('halving shows as -50%', () => {
  assert.equal(weekDeltaRatio([{ volume: 5000 }, { volume: 2500 }]), -0.5);
});

test('only the last two weeks are compared', () => {
  assert.equal(weekDeltaRatio([{ volume: 1 }, { volume: 100 }, { volume: 150 }]), 0.5);
});
