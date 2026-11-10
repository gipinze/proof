// Anatomy: which SVG body part each muscle group lights up.
//
// The geometry is a proper anatomical illustration (separate path per muscle
// head) from react-native-body-highlighter, MIT licensed — see ./body/LICENSE.
// It ships as data in ./body so the app has no runtime dependency on that
// package.
//
// The artwork puts both views in one coordinate space: the front view occupies
// x 0..724 and the back view x 724..1448, each 1448 tall.

import { FRONT } from './body/front-male';
import { BACK } from './body/back-male';
import { FEMALE_FRONT } from './body/front-female';
import { FEMALE_BACK } from './body/back-female';
import type { BodyPart } from './body/types';

export type { BodyPart };
export type { MuscleId } from './muscles';

export type BodyModel = 'male' | 'female';

export const VIEW = {
  front: { viewBox: '0 0 724 1448', parts: FRONT },
  back: { viewBox: '724 0 724 1448', parts: BACK },
  femaleFront: { viewBox: '0 0 724 1448', parts: FEMALE_FRONT },
  femaleBack: { viewBox: '724 0 724 1448', parts: FEMALE_BACK },
} as const;

/** The two views for a chosen body model. */
export function viewsFor(model: BodyModel) {
  return model === 'female'
    ? { front: VIEW.femaleFront, back: VIEW.femaleBack }
    : { front: VIEW.front, back: VIEW.back };
}

/** Aspect ratio of one body view (width / height). */
export const BODY_ASPECT = 724 / 1448;

type SlugMap = Record<string, (import('./muscles').MuscleId)[]>;

/**
 * Which of our muscle ids a given art slug represents, per view. Several ids
 * can share one slug (lats + mid-back are the same drawn shape from behind),
 * and one id can appear on both views (triceps is drawn on the front too).
 */
const FRONT_SLUGS: SlugMap = {
  chest: ['chest'],
  deltoids: ['front_delt', 'side_delt'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearm: ['forearms'],
  abs: ['abs'],
  obliques: ['obliques'],
  quadriceps: ['quads'],
  adductors: ['adductors'],
  trapezius: ['traps'],
  calves: ['calves'],
};

const BACK_SLUGS: SlugMap = {
  trapezius: ['traps'],
  deltoids: ['rear_delt'],
  'upper-back': ['lats', 'mid_back'],
  'lower-back': ['lower_back'],
  triceps: ['triceps'],
  forearm: ['forearms'],
  gluteal: ['glutes'],
  hamstring: ['hamstrings'],
  calves: ['calves'],
  adductors: ['adductors'],
};

/** Intensity for one art slug, combining every muscle id drawn there. */
export function slugIntensity(
  view: 'front' | 'back',
  slug: string,
  load: Partial<Record<string, number>>,
): number | null {
  const ids = (view === 'front' ? FRONT_SLUGS : BACK_SLUGS)[slug];
  if (!ids || ids.length === 0) return null;

  const values = ids.map((id) => load[id]).filter((v): v is number => typeof v === 'number' && v > 0);
  if (values.length === 0) return 0;

  const max = Math.max(...values);
  const rest = values.reduce((sum, v) => sum + v, 0) - max;
  // a second muscle sharing the same shape nudges the colour up, without
  // letting two half-intensity ids outshine one full-intensity id
  return Math.min(1, max + Math.min(0.35, rest * 0.35));
}
