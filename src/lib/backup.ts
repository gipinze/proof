/**
 * Backup shape rules.
 *
 * Kept free of database imports so they can be tested: a corrupt or foreign
 * file must be rejected *before* anything deletes the user's data.
 */

export type BackupSession = {
  id: number;
  kind: string;
  title: string;
  started_at: number;
  ended_at: number | null;
  duration_s: number | null;
  distance_m: number | null;
  track: string | null;
  notes: string | null;
};

export type BackupSet = {
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

export type BackupTemplate = { id: number; name: string; created_at: number; body: string };

export type Backup = {
  app: 'proof';
  format: 1;
  exportedAt: number;
  settings: { key: string; value: string }[];
  sessions: BackupSession[];
  sets: BackupSet[];
  templates: BackupTemplate[];
};

export type BackupSummary = { sessions: number; sets: number; templates: number };

export function describeBackup(backup: Backup): BackupSummary {
  return {
    sessions: backup.sessions?.length ?? 0,
    sets: backup.sets?.length ?? 0,
    templates: backup.templates?.length ?? 0,
  };
}

/** Throws a readable error rather than letting a bad file through. */
export function validateBackup(value: unknown): Backup {
  if (!value || typeof value !== 'object') throw new Error('That file is not a Proof backup.');
  const backup = value as Backup;

  if (backup.app !== 'proof') throw new Error('That file was not exported by Proof.');
  if (!Array.isArray(backup.sessions) || !Array.isArray(backup.sets)) {
    throw new Error('The backup is missing its sessions or sets.');
  }
  if (backup.templates !== undefined && !Array.isArray(backup.templates)) {
    throw new Error('The backup has a malformed template list.');
  }
  if (backup.sessions.length === 0) throw new Error('The backup contains no sessions.');

  for (const session of backup.sessions) {
    if (typeof session.id !== 'number' || typeof session.started_at !== 'number') {
      throw new Error('The backup has a malformed session.');
    }
  }
  for (const set of backup.sets) {
    if (typeof set.session_id !== 'number' || typeof set.exercise_id !== 'string') {
      throw new Error('The backup has a malformed set.');
    }
  }

  return backup;
}
