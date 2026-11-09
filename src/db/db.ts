import * as SQLite from 'expo-sqlite';
import type { SetEntry } from '../lib/volume';
import type { TrackPoint } from '../lib/geo';
import { getExercise } from '../data/exercises';

export type SessionKind = 'lift' | 'run';

export type SessionRow = {
  id: number;
  kind: SessionKind;
  title: string;
  started_at: number;
  ended_at: number | null;
  duration_s: number | null;
  notes: string | null;
  distance_m: number | null;
  track: string | null;
};

export type StoredSet = {
  id: number;
  session_id: number;
  exercise_id: string;
  ordinal: number;
  weight: number;
  reps: number;
  distance_m: number | null;
  is_warmup: number;
};

/**
 * Schema version. Bump this and add a case in `migrate` whenever the shape
 * changes — installed apps upgrade in place and must never lose their data.
 */
const SCHEMA_VERSION = 2;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase, from: number) {
  if (from < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        duration_s INTEGER,
        notes TEXT,
        distance_m REAL,
        track TEXT
      );
      CREATE TABLE IF NOT EXISTS sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL,
        distance_m REAL,
        is_warmup INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_sets_session ON sets(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at DESC);
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  if (from < 2) {
    // v0.2: carries, sleds and cardio machines are measured in metres
    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(sets)`);
    if (!columns.some((c) => c.name === 'distance_m')) {
      await db.execAsync(`ALTER TABLE sets ADD COLUMN distance_m REAL`);
    }
  }
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('proof.db');
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

      const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      const current = row?.user_version ?? 0;
      if (current < SCHEMA_VERSION) {
        await migrate(db, current);
        await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      }
      return db;
    })();
  }
  return dbPromise;
}

// --------------------------------------------------------------------- lifts

async function insertSets(db: SQLite.SQLiteDatabase, sessionId: number, sets: SetEntry[]) {
  let ordinal = 0;
  for (const set of sets) {
    const def = getExercise(set.exerciseId);
    const distance = def.measure === 'distance' ? (set.distanceM ?? 0) : null;
    await db.runAsync(
      `INSERT INTO sets (session_id, exercise_id, ordinal, weight, reps, distance_m, is_warmup)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        set.exerciseId,
        ordinal++,
        set.weight,
        def.measure === 'distance' ? 0 : set.reps,
        distance,
        set.isWarmup ? 1 : 0,
      ],
    );
  }
}

export async function saveLift(input: {
  title: string;
  startedAt: number;
  endedAt: number;
  notes?: string;
  sets: SetEntry[];
}): Promise<number> {
  const db = await getDb();
  const durationS = Math.max(0, Math.round((input.endedAt - input.startedAt) / 1000));

  const res = await db.runAsync(
    `INSERT INTO sessions (kind, title, started_at, ended_at, duration_s, notes)
     VALUES ('lift', ?, ?, ?, ?, ?)`,
    [input.title, input.startedAt, input.endedAt, durationS, input.notes ?? null],
  );
  const sessionId = res.lastInsertRowId;
  await insertSets(db, sessionId, input.sets);
  return sessionId;
}

/** Rewrite a saved lift: title, sets and (optionally) the end time. */
export async function updateLift(
  sessionId: number,
  input: { title: string; endedAt?: number; sets: SetEntry[] },
): Promise<void> {
  const db = await getDb();
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const endedAt = input.endedAt ?? session.ended_at ?? Date.now();
  const durationS = Math.max(0, Math.round((endedAt - session.started_at) / 1000));

  await db.runAsync(`UPDATE sessions SET title = ?, ended_at = ?, duration_s = ? WHERE id = ?`, [
    input.title,
    endedAt,
    durationS,
    sessionId,
  ]);
  await db.runAsync(`DELETE FROM sets WHERE session_id = ?`, [sessionId]);
  await insertSets(db, sessionId, input.sets);
}

export async function renameSession(sessionId: number, title: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE sessions SET title = ? WHERE id = ?`, [title, sessionId]);
}

// ---------------------------------------------------------------------- runs

export async function saveRun(input: {
  title: string;
  startedAt: number;
  endedAt: number;
  distanceM: number;
  track: TrackPoint[];
  notes?: string;
}): Promise<number> {
  const db = await getDb();
  const durationS = Math.max(0, Math.round((input.endedAt - input.startedAt) / 1000));
  const res = await db.runAsync(
    `INSERT INTO sessions (kind, title, started_at, ended_at, duration_s, distance_m, track, notes)
     VALUES ('run', ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.title,
      input.startedAt,
      input.endedAt,
      durationS,
      input.distanceM,
      JSON.stringify(input.track),
      input.notes ?? null,
    ],
  );
  return res.lastInsertRowId;
}

// --------------------------------------------------------------------- reads

export async function listSessions(limit = 40): Promise<SessionRow[]> {
  const db = await getDb();
  return db.getAllAsync<SessionRow>(
    `SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?`,
    [limit],
  );
}

export async function getSession(id: number): Promise<SessionRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<SessionRow>(`SELECT * FROM sessions WHERE id = ?`, [id]);
  return row ?? null;
}

export async function getSessionSets(sessionId: number): Promise<StoredSet[]> {
  const db = await getDb();
  return db.getAllAsync<StoredSet>(
    `SELECT * FROM sets WHERE session_id = ? ORDER BY ordinal ASC`,
    [sessionId],
  );
}

export async function deleteSession(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM sessions WHERE id = ?`, [id]);
}

/** Most recent weight used for an exercise, to pre-fill the next set. */
export async function lastWeightFor(exerciseId: string): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ weight: number }>(
    `SELECT weight FROM sets WHERE exercise_id = ? ORDER BY id DESC LIMIT 1`,
    [exerciseId],
  );
  return row?.weight ?? null;
}

/** Most recent distance used for an exercise, to pre-fill the next set. */
export async function lastDistanceFor(exerciseId: string): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ distance_m: number | null }>(
    `SELECT distance_m FROM sets WHERE exercise_id = ? AND distance_m > 0 ORDER BY id DESC LIMIT 1`,
    [exerciseId],
  );
  return row?.distance_m ?? null;
}

export type SessionListItem = SessionRow & { volume: number; workingSets: number; distanceM: number };

/** Sessions newest-first, with totals already computed so lists need one query. */
export async function listSessionSummaries(limit = 40): Promise<SessionListItem[]> {
  const db = await getDb();
  const sessions = await db.getAllAsync<SessionRow>(
    `SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?`,
    [limit],
  );
  if (sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);
  const placeholders = ids.map(() => '?').join(',');
  const sets = await db.getAllAsync<{
    session_id: number;
    exercise_id: string;
    weight: number;
    reps: number;
    distance_m: number | null;
    is_warmup: number;
  }>(
    `SELECT session_id, exercise_id, weight, reps, distance_m, is_warmup FROM sets WHERE session_id IN (${placeholders})`,
    ids,
  );

  const byId = new Map<number, { volume: number; count: number; distance: number }>();
  for (const set of sets) {
    if (set.is_warmup) continue;
    const def = getExercise(set.exercise_id);
    const cur = byId.get(set.session_id) ?? { volume: 0, count: 0, distance: 0 };
    cur.count += 1;
    if (def.measure === 'distance') cur.distance += set.distance_m ?? 0;
    else cur.volume += set.weight * def.loadFactor * set.reps;
    byId.set(set.session_id, cur);
  }

  return sessions.map((s) => {
    const agg = byId.get(s.id);
    return {
      ...s,
      volume: agg?.volume ?? 0,
      workingSets: agg?.count ?? 0,
      distanceM: agg?.distance ?? 0,
    };
  });
}

export type WeekStats = {
  volume: number;
  distanceM: number;
  lifts: number;
  runs: number;
};

export async function statsSince(fromMs: number): Promise<WeekStats> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ kind: SessionKind; distance_m: number | null; id: number }>(
    `SELECT id, kind, distance_m FROM sessions WHERE started_at >= ?`,
    [fromMs],
  );
  const setRows = await db.getAllAsync<{
    exercise_id: string;
    weight: number;
    reps: number;
    distance_m: number | null;
    is_warmup: number;
  }>(
    `SELECT s.exercise_id, s.weight, s.reps, s.distance_m, s.is_warmup
       FROM sets s JOIN sessions ss ON ss.id = s.session_id
      WHERE ss.started_at >= ?`,
    [fromMs],
  );

  let volume = 0;
  let exerciseDistance = 0;
  for (const row of setRows) {
    if (row.is_warmup) continue;
    const def = getExercise(row.exercise_id);
    if (def.measure === 'distance') exerciseDistance += row.distance_m ?? 0;
    else volume += row.weight * def.loadFactor * row.reps;
  }

  return {
    volume,
    distanceM: rows.reduce((sum, r) => sum + (r.distance_m ?? 0), 0) + exerciseDistance,
    lifts: rows.filter((r) => r.kind === 'lift').length,
    runs: rows.filter((r) => r.kind === 'run').length,
  };
}
