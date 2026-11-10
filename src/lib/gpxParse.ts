import { haversine, type TrackPoint } from './geo';

export type ParsedGpx = {
  name: string;
  points: TrackPoint[];
  distanceM: number;
  startedAt: number;
  endedAt: number;
};

const TRACKPOINT = /<trkpt\b[^>]*\blat="([-0-9.]+)"[^>]*\blon="([-0-9.]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
const SELF_CLOSING = /<trkpt\b[^>]*\blat="([-0-9.]+)"[^>]*\blon="([-0-9.]+)"[^>]*\/>/g;
const TIME = /<time>([^<]+)<\/time>/;
const NAME = /<name>([^<]+)<\/name>/;

function toTimestamp(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const ms = Date.parse(raw.trim());
  return Number.isFinite(ms) ? ms : fallback;
}

/** Pure parser: GPX XML in, track points and totals out. */
export function parseGpx(xml: string): ParsedGpx {
  const fallback = Date.now();
  const name = NAME.exec(xml)?.[1]?.trim() || 'Imported run';

  const points: TrackPoint[] = [];
  // a point with no <time> inherits the previous one + 1s, never "now":
  // otherwise a truncated file would last from the run until today
  let lastTime = fallback;

  const scan = (re: RegExp) => {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(xml))) {
      const lat = Number.parseFloat(match[1]);
      const lon = Number.parseFloat(match[2]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const body = match[3] ?? '';
      const t = toTimestamp(TIME.exec(body)?.[1], lastTime + 1000);
      lastTime = t;
      points.push({ lat, lng: lon, t });
    }
  };

  scan(TRACKPOINT);
  scan(SELF_CLOSING);

  points.sort((a, b) => a.t - b.t);

  let distanceM = 0;
  for (let i = 1; i < points.length; i++) distanceM += haversine(points[i - 1], points[i]);

  return {
    name,
    points,
    distanceM,
    startedAt: points.length ? points[0].t : fallback,
    endedAt: points.length ? points[points.length - 1].t : fallback,
  };
}
