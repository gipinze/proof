import { saveLift, saveRun } from '../db/db';
import type { TrackPoint } from '../lib/geo';
import type { SetEntry } from '../lib/volume';

/**
 * Sample sessions, so a brand-new install can show what a card looks like
 * before the user has logged anything (and so the UI can be exercised without
 * going outside).
 */

type SampleSet = [exerciseId: string, weight: number, reps: number, count: number];

const LIFT_SETS: SampleSet[] = [
  ['barbell-bench', 90, 6, 1],
  ['barbell-bench', 100, 5, 3],
  ['incline-dumbbell-press', 32, 10, 3],
  ['cable-fly', 15, 14, 3],
  ['overhead-press', 50, 8, 3],
  ['lateral-raise', 10, 15, 3],
  ['triceps-pushdown', 30, 12, 3],
  ['hanging-leg-raise', 0, 12, 3],
];

function liftSets(): SetEntry[] {
  const out: SetEntry[] = [];
  for (const [exerciseId, weight, reps, count] of LIFT_SETS) {
    for (let i = 0; i < count; i++) out.push({ exerciseId, weight, reps });
  }
  return out;
}

/** A plausible ~4.2 km loop around Töölö, Helsinki. */
function sampleTrack(startedAt: number, seconds: number, points = 74): TrackPoint[] {
  const lat0 = 60.1795;
  const lng0 = 24.9200;
  const track: TrackPoint[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const angle = t * Math.PI * 2;
    // a lopsided loop, north-east first, then back down along the bay
    const r = 0.0092 * (1 + 0.28 * Math.sin(angle * 2)) * (0.85 + 0.3 * Math.sin(angle * 3 + 1));
    const lat = lat0 + r * Math.sin(angle) * 0.72;
    const lng = lng0 + r * Math.cos(angle);
    track.push({ lat, lng, t: startedAt + Math.round((seconds * 1000 * i) / (points - 1)) });
  }
  return track;
}

export async function createSampleSessions(): Promise<void> {
  const day = new Date();
  day.setHours(14, 18, 0, 0);
  const startedAt = day.getTime();

  await saveLift({
    title: 'Afternoon Weight Training',
    startedAt,
    endedAt: startedAt + 93 * 60_000,
    sets: liftSets(),
  });

  const runStart = startedAt + 4 * 60 * 60_000;
  const seconds = 34 * 60 + 22;
  const track = sampleTrack(runStart, seconds);
  let distance = 0;
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1];
    const b = track[i];
    const dLat = (b.lat - a.lat) * 110540;
    const dLng = (b.lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
    distance += Math.sqrt(dLat * dLat + dLng * dLng);
  }

  await saveRun({
    title: 'Afternoon Run',
    startedAt: runStart,
    endedAt: runStart + seconds * 1000,
    distanceM: distance,
    track,
  });
}
