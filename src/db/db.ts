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
  duration_s: number | null;
  rpe: number | null;
  note: string | null;
  is_warmup: number;
};

/**
 * Schema version. Bump this and add a case in `migrate` whenever the shape
 * changes — installed apps upgrade in place and must never lose their data.
 */
const SCHEMA_VERSION = 8;

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
        duration_s INTEGER,
        rpe REAL,
        note TEXT,
        is_warmup INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_sets_session ON sets(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at DESC);
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS exercise_notes (
        exercise_id TEXT PRIMARY KEY,
        note TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS run_buffer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        t INTEGER NOT NULL,
        accuracy REAL
      );
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        body TEXT NOT NULL
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

  if (from < 8) {
    // v0.10: a standing note or target per exercise ("3×5 at 110")
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercise_notes (
        exercise_id TEXT PRIMARY KEY,
        note TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  if (from < 7) {
    // v0.8: locations the background task collects before the screen sees them
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS run_buffer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        t INTEGER NOT NULL,
        accuracy REAL
      );
    `);
  }

  if (from < 6) {
    // v0.8: optional note on a set ("left wrist twinged")
    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(sets)`);
    if (!columns.some((c) => c.name === 'note')) {
      await db.execAsync(`ALTER TABLE sets ADD COLUMN note TEXT`);
    }
  }

  if (from < 5) {
    // v0.6: optional RPE per set
    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(sets)`);
    if (!columns.some((c) => c.name === 'rpe')) {
      await db.execAsync(`ALTER TABLE sets ADD COLUMN rpe REAL`);
    }
  }

  if (from < 4) {
    // v0.5: reusable workout templates
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        body TEXT NOT NULL
      );
    `);
  }

  if (from < 3) {
    // v0.3: interval and cardio work also records how long the set took
    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(sets)`);
    if (!columns.some((c) => c.name === 'duration_s')) {
      await db.execAsync(`ALTER TABLE sets ADD COLUMN duration_s INTEGER`);
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
      `INSERT INTO sets (session_id, exercise_id, ordinal, weight, reps, distance_m, duration_s, rpe, note, is_warmup)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        set.exerciseId,
        ordinal++,
        set.weight,
        def.measure === 'distance' ? 0 : set.reps,
        distance,
        def.measure === 'distance' ? (set.durationS ?? null) : null,
        set.rpe ?? null,
        set.note?.trim() ? set.note.trim() : null,
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
    duration_s: number | null;
    rpe: number | null;
    is_warmup: number;
  }>(
    `SELECT session_id, exercise_id, weight, reps, distance_m, duration_s, rpe, is_warmup FROM sets WHERE session_id IN (${placeholders})`,
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
    duration_s: number | null;
    rpe: number | null;
    is_warmup: number;
  }>(
    `SELECT s.exercise_id, s.weight, s.reps, s.distance_m, s.duration_s, s.rpe, s.is_warmup
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

// ----------------------------------------------------------------- progress

export { estimate1rm } from '../lib/pr';
import { estimate1rm, isPersonalRecord } from '../lib/pr';

export type SessionPR = { exerciseId: string; best: number; previous: number; isPR: boolean };

/**
 * Which lifts in this session beat everything recorded before it. Compares the
 * session's best estimated 1RM per exercise with the best from earlier
 * sessions only, so re-opening a session never makes it beat itself.
 */
export async function personalRecords(
  session: SessionRow,
  sets: StoredSet[],
): Promise<Map<string, SessionPR>> {
  const db = await getDb();
  const ids = [
    ...new Set(
      sets
        .filter((s) => !s.is_warmup && s.reps > 0 && s.weight > 0)
        .map((s) => s.exercise_id),
    ),
  ];
  if (ids.length === 0) return new Map();

  const placeholders = ids.map(() => '?').join(',');
  const history = await db.getAllAsync<{ exercise_id: string; weight: number; reps: number }>(
    `SELECT s.exercise_id, s.weight, s.reps
       FROM sets s JOIN sessions ss ON ss.id = s.session_id
      WHERE s.exercise_id IN (${placeholders})
        AND s.is_warmup = 0 AND s.reps > 0 AND s.weight > 0
        AND ss.started_at < ?`,
    [...ids, session.started_at],
  );

  const previous = new Map<string, number>();
  for (const row of history) {
    const value = estimate1rm(row.weight, getExercise(row.exercise_id).loadFactor, row.reps);
    previous.set(row.exercise_id, Math.max(previous.get(row.exercise_id) ?? 0, value));
  }

  const out = new Map<string, SessionPR>();
  for (const id of ids) {
    const factor = getExercise(id).loadFactor;
    const best = sets
      .filter((s) => s.exercise_id === id && !s.is_warmup && s.reps > 0)
      .reduce((max, s) => Math.max(max, estimate1rm(s.weight, factor, s.reps)), 0);
    const before = previous.get(id) ?? 0;
    // no history means "first time", not a personal record
    out.set(id, { exerciseId: id, best, previous: before, isPR: isPersonalRecord(best, before) });
  }
  return out;
}

export type WeekBucket = { weekStart: number; volume: number; distanceM: number };

/** Monday-starting volume buckets for the progress chart. */
export async function weeklyVolume(weeks = 6): Promise<WeekBucket[]> {
  const db = await getDb();
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const firstWeek = new Date(monday);
  firstWeek.setDate(monday.getDate() - (weeks - 1) * 7);

  const rows = await db.getAllAsync<{
    exercise_id: string;
    weight: number;
    reps: number;
    distance_m: number | null;
    is_warmup: number;
    started_at: number;
  }>(
    `SELECT s.exercise_id, s.weight, s.reps, s.distance_m, s.is_warmup, ss.started_at
       FROM sets s JOIN sessions ss ON ss.id = s.session_id
      WHERE ss.started_at >= ? AND ss.kind = 'lift'`,
    [firstWeek.getTime()],
  );

  const buckets: WeekBucket[] = [];
  for (let i = 0; i < weeks; i++) {
    const start = new Date(firstWeek);
    start.setDate(firstWeek.getDate() + i * 7);
    buckets.push({ weekStart: start.getTime(), volume: 0, distanceM: 0 });
  }

  for (const row of rows) {
    if (row.is_warmup) continue;
    const index = Math.floor((row.started_at - firstWeek.getTime()) / (7 * 24 * 3600 * 1000));
    if (index < 0 || index >= buckets.length) continue;
    const def = getExercise(row.exercise_id);
    if (def.measure === 'distance') buckets[index].distanceM += row.distance_m ?? 0;
    else buckets[index].volume += row.weight * def.loadFactor * row.reps;
  }

  return buckets;
}

/** Hard sets per muscle since a date � the Home "split" bars. */
export async function muscleSetsSince(fromMs: number): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ exercise_id: string }>(
    `SELECT s.exercise_id
       FROM sets s JOIN sessions ss ON ss.id = s.session_id
      WHERE ss.started_at >= ? AND s.is_warmup = 0`,
    [fromMs],
  );

  const { muscleLoad } = await import('../lib/volume');
  const load = muscleLoad(rows.map((r) => ({ exerciseId: r.exercise_id, weight: 1, reps: 1 })));
  return load as Record<string, number>;
}

// ---------------------------------------------------------------- templates

export type TemplateRow = {
  id: number;
  name: string;
  created_at: number;
  body: string;
};

export type TemplateExercise = {
  exerciseId: string;
  sets: {
    weight: number;
    reps: number;
    distanceM?: number;
    durationS?: number;
    rpe?: number;
    note?: string;
    isWarmup?: boolean;
  }[];
};

export async function saveTemplate(name: string, exercises: TemplateExercise[]): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    `INSERT INTO templates (name, created_at, body) VALUES (?, ?, ?)`,
    [name, Date.now(), JSON.stringify(exercises)],
  );
  return res.lastInsertRowId;
}

export async function listTemplates(): Promise<TemplateRow[]> {
  const db = await getDb();
  return db.getAllAsync<TemplateRow>(`SELECT * FROM templates ORDER BY created_at DESC`);
}

export async function getTemplate(id: number): Promise<TemplateRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TemplateRow>(`SELECT * FROM templates WHERE id = ?`, [id]);
  return row ?? null;
}

export async function deleteTemplate(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM templates WHERE id = ?`, [id]);
}

export function parseTemplate(row: TemplateRow): TemplateExercise[] {
  try {
    const parsed = JSON.parse(row.body) as TemplateExercise[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// --------------------------------------------------------------- week recap

export type WeekSummary = {
  from: number;
  to: number;
  sessions: number;
  lifts: number;
  runs: number;
  volume: number;
  distanceM: number;
  loadDistance: number;
  muscle: Record<string, number>;
};

/** Everything the recap card needs for a Monday-to-now window. */
export async function weekSummary(fromMs: number): Promise<WeekSummary> {
  const db = await getDb();
  const to = Date.now();
  const sessions = await db.getAllAsync<{ id: number; kind: SessionKind; distance_m: number | null }>(
    `SELECT id, kind, distance_m FROM sessions WHERE started_at >= ? AND started_at <= ?`,
    [fromMs, to],
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
      WHERE ss.started_at >= ? AND ss.started_at <= ?`,
    [fromMs, to],
  );

  const { muscleLoad } = await import('../lib/volume');
  let volume = 0;
  let loadDistance = 0;
  for (const row of setRows) {
    if (row.is_warmup) continue;
    const def = getExercise(row.exercise_id);
    if (def.measure === 'distance') loadDistance += row.weight * def.loadFactor * (row.distance_m ?? 0);
    else volume += row.weight * def.loadFactor * row.reps;
  }

  const muscle = muscleLoad(
    setRows
      .filter((r) => !r.is_warmup)
      .map((r) => ({ exerciseId: r.exercise_id, weight: 1, reps: 1 })),
  ) as Record<string, number>;

  return {
    from: fromMs,
    to,
    sessions: sessions.length,
    lifts: sessions.filter((s) => s.kind === 'lift').length,
    runs: sessions.filter((s) => s.kind === 'run').length,
    volume,
    distanceM:
      sessions.reduce((sum, s) => sum + (s.distance_m ?? 0), 0) +
      setRows.reduce((sum, r) => sum + (r.is_warmup ? 0 : (r.distance_m ?? 0)), 0),
    loadDistance,
    muscle,
  };
}

// ----------------------------------------------------------------- backup

export type { Backup, BackupSummary } from '../lib/backup';
import { describeBackup, type Backup, type BackupSummary } from '../lib/backup';

/** Everything, in one JSON-serialisable object. */
export async function exportBackup(): Promise<Backup> {
  const db = await getDb();
  const [settings, sessions, sets, templates] = await Promise.all([
    db.getAllAsync<{ key: string; value: string }>(`SELECT key, value FROM settings`),
    db.getAllAsync<Backup['sessions'][number]>(`SELECT * FROM sessions ORDER BY id`),
    db.getAllAsync<Backup['sets'][number]>(`SELECT * FROM sets ORDER BY id`),
    db.getAllAsync<Backup['templates'][number]>(`SELECT * FROM templates ORDER BY id`),
  ]);

  return {
    app: 'proof',
    format: 1,
    exportedAt: Date.now(),
    settings,
    sessions,
    sets,
    templates,
  };
}

/** Replace everything with the backup, in one transaction. */
export async function importBackup(backup: Backup): Promise<BackupSummary> {
  const db = await getDb();
  const summary = describeBackup(backup);

  await db.withTransactionAsync(async () => {
    await db.execAsync(`DELETE FROM sets; DELETE FROM sessions; DELETE FROM templates;`);

    for (const session of backup.sessions) {
      await db.runAsync(
        `INSERT INTO sessions (id, kind, title, started_at, ended_at, duration_s, distance_m, track, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.kind,
          session.title,
          session.started_at,
          session.ended_at,
          session.duration_s ?? null,
          session.distance_m ?? null,
          session.track ?? null,
          session.notes ?? null,
        ],
      );
    }

    for (const set of backup.sets) {
      await db.runAsync(
        `INSERT INTO sets (id, session_id, exercise_id, ordinal, weight, reps, distance_m, duration_s, rpe, note, is_warmup)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          set.id,
          set.session_id,
          set.exercise_id,
          set.ordinal,
          set.weight,
          set.reps,
          set.distance_m ?? null,
          set.duration_s ?? null,
          set.rpe ?? null,
          set.note ?? null,
          set.is_warmup ?? 0,
        ],
      );
    }

    for (const template of backup.templates ?? []) {
      await db.runAsync(
        `INSERT INTO templates (id, name, created_at, body) VALUES (?, ?, ?, ?)`,
        [template.id, template.name, template.created_at, template.body],
      );
    }

    await db.execAsync(`DELETE FROM settings`);
    for (const row of backup.settings ?? []) {
      await db.runAsync(`INSERT INTO settings (key, value) VALUES (?, ?)`, [row.key, row.value]);
    }
  });

  return summary;
}


// ------------------------------------------------------- background run buffer

export type BufferedPoint = { lat: number; lng: number; t: number; accuracy: number | null };

/**
 * The background location task can run in its own JS context, where the Run
 * screen's in-memory listener does not exist. Fixes are written here first, and
 * the screen drains the buffer whenever it is (re)foregrounded.
 */
export async function bufferPoint(point: BufferedPoint): Promise<void> {
  const db = await getDb();
  await db.runAsync(`INSERT INTO run_buffer (lat, lng, t, accuracy) VALUES (?, ?, ?, ?)`, [
    point.lat,
    point.lng,
    point.t,
    point.accuracy,
  ]);
}

export async function readBufferedPoints(): Promise<BufferedPoint[]> {
  const db = await getDb();
  return db.getAllAsync<BufferedPoint>(`SELECT lat, lng, t, accuracy FROM run_buffer ORDER BY t ASC`);
}

export async function clearBufferedPoints(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`DELETE FROM run_buffer`);
}

// ------------------------------------------------------- exercise history

export type ExerciseSessionRow = {
  sessionId: number;
  startedAt: number;
  title: string;
  sets: number;
  reps: number;
  bestWeight: number;
  bestReps: number;
  best1rm: number;
  volume: number;
  distanceM: number;
  topRpe: number | null;
};

/**
 * One row per session that trained this exercise, newest first. The screen
 * draws the trend from `best1rm`, which is the honest comparison across
 * different rep ranges.
 */
export async function exerciseHistory(exerciseId: string): Promise<ExerciseSessionRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    session_id: number;
    started_at: number;
    title: string;
    weight: number;
    reps: number;
    distance_m: number | null;
    rpe: number | null;
    is_warmup: number;
  }>(
    `SELECT s.session_id, ss.started_at, ss.title, s.weight, s.reps, s.distance_m, s.rpe, s.is_warmup
       FROM sets s JOIN sessions ss ON ss.id = s.session_id
      WHERE s.exercise_id = ?
      ORDER BY ss.started_at DESC`,
    [exerciseId],
  );

  const def = getExercise(exerciseId);
  const bySession = new Map<number, ExerciseSessionRow>();

  for (const row of rows) {
    if (row.is_warmup) continue;
    const entry =
      bySession.get(row.session_id) ??
      ({
        sessionId: row.session_id,
        startedAt: row.started_at,
        title: row.title,
        sets: 0,
        reps: 0,
        bestWeight: 0,
        bestReps: 0,
        best1rm: 0,
        volume: 0,
        distanceM: 0,
        topRpe: null,
      } satisfies ExerciseSessionRow);

    entry.sets += 1;
    entry.reps += row.reps;
    entry.distanceM += row.distance_m ?? 0;
    entry.volume += row.weight * def.loadFactor * row.reps;
    entry.topRpe = row.rpe != null ? Math.max(entry.topRpe ?? 0, row.rpe) : entry.topRpe;

    const e1rm = estimate1rm(row.weight, def.loadFactor, row.reps);
    if (e1rm > entry.best1rm) {
      entry.best1rm = e1rm;
      entry.bestWeight = row.weight;
      entry.bestReps = row.reps;
    }

    bySession.set(row.session_id, entry);
  }

  return [...bySession.values()].sort((a, b) => b.startedAt - a.startedAt);
}

// ------------------------------------------------------------- search index

export type SearchIndexRow = { session_id: number; exercise_id: string; note: string | null };

/**
 * Which exercises (and notes) belong to which session, newest sessions first.
 * Search runs in JS against the exercise catalogue, so the database only has to
 * hand over ids.
 */
export async function searchIndex(limit = 400): Promise<SearchIndexRow[]> {
  const db = await getDb();
  const recent = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM sessions ORDER BY started_at DESC LIMIT ?`,
    [limit],
  );
  if (recent.length === 0) return [];

  const ids = recent.map((row) => row.id);
  const placeholders = ids.map(() => '?').join(',');
  return db.getAllAsync<SearchIndexRow>(
    `SELECT session_id, exercise_id, note FROM sets WHERE session_id IN (${placeholders})`,
    ids,
  );
}


// --------------------------------------------------------- exercise notes

export type ExerciseNote = { exerciseId: string; note: string; updatedAt: number };

export async function allExerciseNotes(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ exercise_id: string; note: string }>(
    `SELECT exercise_id, note FROM exercise_notes`,
  );
  const out: Record<string, string> = {};
  for (const row of rows) out[row.exercise_id] = row.note;
  return out;
}

export async function setExerciseNote(exerciseId: string, note: string): Promise<void> {
  const db = await getDb();
  const trimmed = note.trim();
  if (trimmed.length === 0) {
    await db.runAsync(`DELETE FROM exercise_notes WHERE exercise_id = ?`, [exerciseId]);
    return;
  }
  await db.runAsync(
    `INSERT INTO exercise_notes (exercise_id, note, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(exercise_id) DO UPDATE SET note = excluded.note, updated_at = excluded.updated_at`,
    [exerciseId, trimmed, Date.now()],
  );
}
