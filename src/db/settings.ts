import { getDb } from '../db/db';

const cache = new Map<string, string>();

export async function getSetting(key: string, fallback = ''): Promise<string> {
  if (cache.has(key)) return cache.get(key)!;
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, [key]);
  const value = row?.value ?? fallback;
  cache.set(key, value);
  return value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
  cache.set(key, value);
}

export const ATHLETE_KEY = 'athlete_name';
export const LOCATION_KEY = 'home_location';
