/** Formatting helpers shared by the app and the share cards. */

export function km(meters: number): string {
  const v = meters / 1000;
  return v >= 100 ? v.toFixed(0) : v.toFixed(2);
}

export function kmUnit(meters: number): string {
  return meters >= 100000 ? 'km' : 'km';
}

/** 34m22s -> "34:22", 1h02 -> "1:02:33" */
export function duration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** "34m 22s" */
export function durationLong(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

/** seconds per km -> "8:35" */
export function pace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  if (s === 60) return `${m + 1}:00`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function paceFrom(distanceM: number, seconds: number): number {
  if (distanceM < 5) return 0;
  return seconds / (distanceM / 1000);
}

/** 24578 -> "24,578" */
export function num(value: number, decimals = 0): string {
  const fixed = value.toFixed(decimals);
  const [int, frac] = fixed.split('.');
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${withSep}.${frac}` : withSep;
}

export function kgLabel(value: number): string {
  if (value >= 10000) return `${num(Math.round(value / 100) / 10)}t`;
  return `${num(value)} kg`;
}

/** Split a tonnage into a big number and its unit, for stat blocks. */
export function volumeParts(value: number): { value: string; unit: string } {
  if (value >= 10000) return { value: (value / 1000).toFixed(1), unit: 't' };
  return { value: num(Math.round(value)), unit: 'kg' };
}

export function timeOfDay(date: Date): string {
  const h = date.getHours();
  if (h < 5) return 'Night';
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  if (h < 21) return 'Evening';
  return 'Night';
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "November 7, 2026 at 2:18 PM" */
export function fullDate(ms: number): string {
  const d = new Date(ms);
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${h}:${m} ${ampm}`;
}

/** "Today", "Yesterday", "Nov 7" */
export function relativeDay(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function weekdayShort(ms: number): string {
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(ms).getDay()];
}

/**
 * Reads a duration the user typed: `105` (seconds), `1:45` (m:ss) or
 * `1:02:30` (h:mm:ss). Returns 0 when it is not a duration.
 */
export function parseTime(value: string): number {
  const raw = value.trim().replace(',', '.');
  if (!raw) return 0;
  if (!raw.includes(':')) {
    const seconds = Number.parseFloat(raw);
    return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
  }
  const parts = raw.split(':').map((p) => Number.parseInt(p, 10));
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return 0;
  const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  if (parts.length > 3) return 0;
  return h * 3600 + m * 60 + s;
}
