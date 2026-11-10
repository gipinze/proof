import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BODY_ASPECT, viewsFor } from '../src/data/anatomy';

const slugs = (model: 'male' | 'female', view: 'front' | 'back') =>
  viewsFor(model)[view].parts.map((p) => p.slug).sort();

test('both body models are available', () => {
  assert.ok(viewsFor('male').front.parts.length > 10);
  assert.ok(viewsFor('female').front.parts.length > 10);
  assert.ok(viewsFor('female').back.parts.length > 10);
});

test('the female drawing has every muscle the male one has', () => {
  // the female art omits two non-muscle pieces (head, ankles)
  const missingFront = slugs('male', 'front').filter((s) => !slugs('female', 'front').includes(s));
  const missingBack = slugs('male', 'back').filter((s) => !slugs('female', 'back').includes(s));

  assert.deepEqual(missingFront, [], 'front muscles must exist on both models');
  assert.deepEqual(missingBack.filter((s) => s !== 'head' && s !== 'ankles'), []);
});

test('the muscle groups we track are drawn on both models', () => {
  const wanted = ['chest', 'abs', 'obliques', 'quadriceps', 'adductors', 'biceps', 'forearm'];
  const backWanted = ['upper-back', 'lower-back', 'gluteal', 'hamstring', 'calves', 'trapezius'];

  for (const model of ['male', 'female'] as const) {
    for (const slug of wanted) {
      assert.ok(slugs(model, 'front').includes(slug), `${model} front is missing ${slug}`);
    }
    for (const slug of backWanted) {
      assert.ok(slugs(model, 'back').includes(slug), `${model} back is missing ${slug}`);
    }
  }
});

test('both models share the same view boxes, so layout maths does not change', () => {
  assert.equal(viewsFor('female').front.viewBox, viewsFor('male').front.viewBox);
  assert.equal(viewsFor('female').back.viewBox, viewsFor('male').back.viewBox);
  assert.ok(Math.abs(BODY_ASPECT - 0.5) < 0.01);
});
