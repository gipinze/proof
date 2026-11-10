import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAR_KG, platesPerSide } from '../src/lib/plates';

test('120 kg on a 20 kg bar is 25 + 25 per side', () => {
  const { plates, leftover } = platesPerSide(120);
  assert.deepEqual(plates, [25, 25]);
  assert.equal(leftover, 0);
});

test('100 kg needs a 25 and a 15', () => {
  assert.deepEqual(platesPerSide(100).plates, [25, 15]);
});

test('a bar with nothing on it is not an error', () => {
  assert.deepEqual(platesPerSide(BAR_KG), { plates: [], leftover: 0 });
  assert.deepEqual(platesPerSide(10), { plates: [], leftover: 0 });
});

test('fractional plates work: 102.5 kg', () => {
  const { plates, leftover } = platesPerSide(102.5);
  assert.deepEqual(plates, [25, 15, 1.25]);
  assert.equal(leftover, 0);
});

test('impossible weights report a leftover instead of lying', () => {
  const { plates, leftover } = platesPerSide(101);
  assert.equal(leftover > 0, true);
  assert.ok(plates.length > 0);
});

test('a custom bar weight is respected', () => {
  // 15 kg bar, 55 kg total => 20 per side => 20
  assert.deepEqual(platesPerSide(55, 15).plates, [20]);
});

test('negative and NaN inputs return an empty breakdown', () => {
  assert.deepEqual(platesPerSide(-5), { plates: [], leftover: 0 });
  assert.deepEqual(platesPerSide(Number.NaN), { plates: [], leftover: 0 });
});
