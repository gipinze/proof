export type TrackPoint = { lat: number; lng: number; t: number };

const R = 6371000;

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function trackDistance(points: TrackPoint[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += haversine(points[i - 1], points[i]);
  return d;
}

/** Ramer-Douglas-Peucker, operating on lat/lng in metres. */
export function simplifyTrack(points: TrackPoint[], toleranceM = 4): TrackPoint[] {
  if (points.length <= 2) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const dist = perpendicularDistance(points[i], points[start], points[end]);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    if (index !== -1 && maxDist > toleranceM) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function perpendicularDistance(p: TrackPoint, a: TrackPoint, b: TrackPoint): number {
  // local flat projection around the segment
  const latRef = (a.lat * Math.PI) / 180;
  const x = (q: TrackPoint) => (q.lng - a.lng) * Math.cos(latRef) * 111320;
  const y = (q: TrackPoint) => (q.lat - a.lat) * 110540;
  const px = x(p);
  const py = y(p);
  const bx = x(b);
  const by = y(b);
  const lenSq = bx * bx + by * by;
  if (lenSq === 0) return Math.sqrt(px * px + py * py);
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / lenSq));
  const dx = px - t * bx;
  const dy = py - t * by;
  return Math.sqrt(dx * dx + dy * dy);
}

export type XY = { x: number; y: number };

/**
 * Fit a track into a width x height box, preserving its true aspect ratio, so
 * a 5 km loop and a 400 m sprint both fill the card sensibly.
 */
export function projectTrack(points: TrackPoint[], width: number, height: number, padding = 0): XY[] {
  if (points.length === 0) return [];
  const latRef = (points[0].lat * Math.PI) / 180;
  const xs = points.map((p) => p.lng * Math.cos(latRef));
  const ys = points.map((p) => -p.lat);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const innerW = Math.max(width - padding * 2, 1);
  const innerH = Math.max(height - padding * 2, 1);
  const scale = Math.min(innerW / spanX, innerH / spanY);

  const offsetX = padding + (innerW - spanX * scale) / 2;
  const offsetY = padding + (innerH - spanY * scale) / 2;

  return points.map((_, i) => ({
    x: offsetX + (xs[i] - minX) * scale,
    y: offsetY + (ys[i] - minY) * scale,
  }));
}

export function toPolyline(points: XY[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}
