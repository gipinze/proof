import { test } from 'node:test';
import assert from 'node:assert/strict';
import { duration, km, pace, paceFrom, parseTime } from '../src/lib/format';

test('parseTime accepts plain seconds, mm:ss and h:mm:ss', () => {
  assert.equal(parseTime('105'), 105);
  assert.equal(parseTime('1:45'), 105);
  assert.equal(parseTime('1:02:30'), 3750);
  assert.equal(parseTime('0:00'), 0);
});

test('parseTime refuses nonsense instead of producing NaN', () => {
  assert.equal(parseTime(''), 0);
  assert.equal(parseTime('abc'), 0);
  assert.equal(parseTime('1::2'), 0);
});

test('duration formats clock-style and never goes negative', () => {
  assert.equal(duration(0), '0:00');
  assert.equal(duration(59), '0:59');
  assert.equal(duration(60), '1:00');
  assert.equal(duration(3750), '1:02:30');
  assert.equal(duration(-5), '0:00');
});

test('paceFrom returns seconds per km and gives up under 5 m', () => {
  assert.equal(paceFrom(0, 1000), 0);
  assert.equal(paceFrom(5000, 1500), 300);
  assert.equal(pace(300), '5:00');
  assert.equal(pace(0), '--:--');
});

test('km shows two decimals until 100 km, then whole kilometres', () => {
  assert.equal(km(0), '0.00');
  assert.equal(km(4290), '4.29');
  assert.equal(km(12300), '12.30');
  assert.equal(km(123000), '123');
});
