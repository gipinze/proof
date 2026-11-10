import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterSessions, matchesQuery, normalise } from '../src/lib/search';

const sessions = [
  { id: 1, title: 'Afternoon Weight Training', exercises: ['Barbell Bench Press', 'Cable Fly'], notes: null },
  { id: 2, title: 'NCarry', exercises: ["Farmer's Carry"], notes: 'grip slipped' },
  { id: 3, title: 'Morning Run', exercises: [], notes: null },
  { id: 4, title: 'Push A', exercises: ['Incline Dumbbell Press'], notes: 'shoulder felt fine' },
];

test('an empty query keeps everything', () => {
  assert.equal(filterSessions(sessions, '').length, 4);
  assert.equal(filterSessions(sessions, '   ').length, 4);
});

test('matches the session title, case-insensitively', () => {
  assert.deepEqual(filterSessions(sessions, 'ncarry').map((s) => s.id), [2]);
});

test('matches an exercise name inside the session', () => {
  assert.deepEqual(filterSessions(sessions, 'bench').map((s) => s.id), [1]);
  assert.deepEqual(filterSessions(sessions, 'farmer').map((s) => s.id), [2]);
});

test('matches a note', () => {
  assert.deepEqual(filterSessions(sessions, 'shoulder').map((s) => s.id), [4]);
});

test('multiple words must all match', () => {
  assert.deepEqual(filterSessions(sessions, 'weight training').map((s) => s.id), [1]);
  assert.deepEqual(filterSessions(sessions, 'weight carry'), []);
});

test('accents are ignored', () => {
  assert.equal(normalise('Pressión Ünïcode'), 'pression unicode');
  assert.equal(matchesQuery({ id: 9, title: 'Pressión', exercises: [] }, 'pression'), true);
});

test('a query that matches nothing returns an empty list, not everything', () => {
  assert.deepEqual(filterSessions(sessions, 'zzzz'), []);
});
