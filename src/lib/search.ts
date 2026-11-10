/**
 * History search.
 *
 * Pure so it can be tested: the rules are small but easy to get wrong (case,
 * accents, multi-word queries, notes that mention the word you typed).
 */

export type SearchableSession = {
  id: number;
  title: string;
  /** Exercise names trained in this session. */
  exercises: string[];
  /** Free text from the session and its sets. */
  notes?: string | null;
};

/** Lowercase and strip accents, so "Pressión" matches "pression". */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function haystack(session: SearchableSession): string {
  return normalise([session.title, ...session.exercises, session.notes ?? ''].join(' '));
}

/**
 * Every word in the query must appear somewhere in the session — title,
 * exercise, or note. An empty query matches everything.
 */
export function matchesQuery(session: SearchableSession, query: string): boolean {
  const tokens = normalise(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return true;

  const text = haystack(session);
  return tokens.every((token) => text.includes(token));
}

export function filterSessions(sessions: SearchableSession[], query: string): SearchableSession[] {
  if (normalise(query).length === 0) return sessions;
  return sessions.filter((session) => matchesQuery(session, query));
}
