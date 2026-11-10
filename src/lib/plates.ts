/**
 * Plate maths.
 *
 * Pure on purpose: the UI only formats what this returns, and the rules
 * (bar weight, which plates exist, greedy largest-first) are easy to get
 * subtly wrong, so they live here under test.
 */

export const BAR_KG = 20;

/** Standard metric plates, heaviest first — the order matters for the greedy pass. */
export const PLATE_SIZES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

export type PlateBreakdown = {
  /** Plates to load on each side, heaviest first. */
  plates: number[];
  /** Weight that could not be built from whole plates (per side). */
  leftover: number;
};

export function platesPerSide(totalKg: number, barKg: number = BAR_KG): PlateBreakdown {
  if (!Number.isFinite(totalKg) || totalKg <= barKg) return { plates: [], leftover: 0 };

  let left = (totalKg - barKg) / 2;
  const plates: number[] = [];

  for (const size of PLATE_SIZES) {
    while (left + 1e-9 >= size) {
      plates.push(size);
      left -= size;
    }
  }

  // floats: 1.25 + 1.25 arithmetic can leave dust like 2e-16
  const leftover = left > 0.005 ? Number(left.toFixed(2)) : 0;
  return { plates, leftover };
}
