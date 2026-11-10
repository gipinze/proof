import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnatomyPair } from '../components/AnatomyMap';
import { RouteMap } from '../components/RouteMap';
import { Button, Card, IconButton, Screen, SectionLabel, Stat } from '../components/ui';
import { getExercise } from '../data/exercises';
import { MUSCLE_NAME } from '../data/muscles';
import type { MuscleId } from '../data/anatomy';
import {
  deleteSession,
  getSession,
  getSessionSets,
  personalRecords,
  renameSession,
  type SessionPR,
  type SessionRow,
  type StoredSet,
} from '../db/db';
import { duration, fullDate, km, kgLabel, num, pace, paceFrom } from '../lib/format';
import { muscleLoad, normalisedLoad, rankedMuscles, summarizeSets, type SetEntry } from '../lib/volume';
import type { TrackPoint } from '../lib/geo';
import type { Nav } from '../nav';
import { colors, radius, space, tabular, type } from '../theme';

export function SessionScreen({ nav, sessionId }: { nav: Nav; sessionId: number }) {
  const { width: winW } = useWindowDimensions();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [sets, setSets] = useState<StoredSet[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [prs, setPrs] = useState<Map<string, SessionPR>>(new Map());

  const load = useCallback(async () => {
    const row = await getSession(sessionId);
    setSession(row);
    if (row) setTitleDraft(row.title);
    if (row?.kind === 'lift') {
      const stored = await getSessionSets(sessionId);
      setSets(stored);
      setPrs(await personalRecords(row, stored).catch(() => new Map()));
    }
  }, [sessionId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load, nav.dataVersion]);

  const entries: SetEntry[] = useMemo(
    () =>
      sets.map((s) => ({
        exerciseId: s.exercise_id,
        weight: s.weight,
        reps: s.reps,
        distanceM: s.distance_m ?? undefined,
        isWarmup: s.is_warmup === 1,
      })),
    [sets],
  );

  const summary = useMemo(() => summarizeSets(entries), [entries]);
  const load01 = useMemo(() => normalisedLoad(muscleLoad(entries)), [entries]);
  const topMuscles = useMemo(() => rankedMuscles(muscleLoad(entries)).slice(0, 4), [entries]);

  const track: TrackPoint[] = useMemo(() => {
    if (!session?.track) return [];
    try {
      return JSON.parse(session.track) as TrackPoint[];
    } catch {
      return [];
    }
  }, [session]);

  const groups = useMemo(() => {
    const map = new Map<string, StoredSet[]>();
    for (const set of [...sets].sort((a, b) => a.ordinal - b.ordinal)) {
      const list = map.get(set.exercise_id) ?? [];
      list.push(set);
      map.set(set.exercise_id, list);
    }
    return [...map.entries()];
  }, [sets]);

  const remove = () => {
    Alert.alert('Delete session?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSession(sessionId);
          nav.bump();
          nav.back();
        },
      },
    ]);
  };

  const saveTitle = async () => {
    const clean = titleDraft.trim();
    if (!clean) {
      setRenaming(false);
      return;
    }
    await renameSession(sessionId, clean);
    setSession((s) => (s ? { ...s, title: clean } : s));
    setRenaming(false);
    nav.bump();
  };

  if (!session) {
    return (
      <Screen>
        <Text style={{ color: colors.muted }}>Loading…</Text>
      </Screen>
    );
  }

  const isRun = session.kind === 'run';
  const distanceM = session.distance_m ?? 0;
  const seconds = session.duration_s ?? 0;
  const hasDistanceWork = summary.distanceM > 0;
  const prCount = [...prs.values()].filter((p) => p.isPR).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen scroll contentStyle={{ paddingBottom: space(24) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
        <IconButton icon="chevron-back" onPress={nav.back} size={34} bg={colors.surface} />
        <Text style={{ ...type.caption, color: colors.muted, flex: 1 }}>{fullDate(session.started_at)}</Text>
        {!isRun ? (
          <IconButton
            icon="create-outline"
            onPress={() => nav.editSession(sessionId)}
            size={34}
            bg={colors.surface}
          />
        ) : null}
        <IconButton
          icon="share-outline"
          onPress={() => nav.push({ name: 'share', id: sessionId })}
          size={34}
          bg={colors.surface}
        />
        <IconButton icon="trash-outline" onPress={remove} size={34} bg={colors.surface} />
      </View>

      <Pressable onPress={() => setRenaming(true)} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Text style={{ ...type.display, color: colors.text, marginTop: space(5), flex: 1 }}>
          {session.title}
        </Text>
        <Ionicons name="pencil" size={16} color={colors.faint} style={{ marginTop: space(6) }} />
      </Pressable>

      {isRun ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space(5) }}>
            <Stat label="Distance" value={km(distanceM)} unit="km" size="lg" />
            <Stat label="Pace" value={pace(paceFrom(distanceM, seconds))} unit="/km" size="lg" />
            <Stat label="Time" value={duration(seconds)} size="lg" />
          </View>

          <View style={{ marginTop: space(5) }}>
            {track.length > 1 ? (
              <RouteMap track={track} width={winW - 32} height={280} grid label="Route" />
            ) : (
              <Card>
                <Text style={{ ...type.body, color: colors.muted }}>No track points recorded.</Text>
              </Card>
            )}
          </View>
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space(5) }}>
            <Stat
              label={summary.volume > 0 ? 'Volume' : 'Carried'}
              value={
                summary.volume > 0
                  ? num(Math.round(summary.volume))
                  : num(Math.round(summary.loadDistance))
              }
              unit={summary.volume > 0 ? 'kg' : 'kg·m'}
              size="lg"
            />
            {hasDistanceWork ? (
              <Stat label="Distance" value={num(Math.round(summary.distanceM))} unit="m" size="lg" />
            ) : (
              <Stat label="Sets" value={`${summary.sets}`} size="lg" />
            )}
            <Stat label="Time" value={duration(seconds)} size="lg" />
          </View>

          {hasDistanceWork ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space(2),
                marginTop: space(3),
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.md,
                paddingHorizontal: space(3.5),
                paddingVertical: space(2.5),
              }}
            >
              <Ionicons name="walk-outline" size={15} color={colors.accentText} />
              <Text style={{ ...type.caption, color: colors.muted, flex: 1 }}>
                {num(Math.round(summary.distanceM))} m covered
                {summary.loadDistance > 0
                  ? ` · ${num(Math.round(summary.loadDistance))} kg·m carried`
                  : ''}
                {summary.distanceTimeS > 0 ? ` · ${duration(summary.distanceTimeS)} timed` : ''}
                {` · ${summary.sets} ${summary.sets === 1 ? 'set' : 'sets'}`}
              </Text>
            </View>
          ) : null}

          <Card style={{ marginTop: space(5), alignItems: 'center', paddingVertical: space(4) }}>
            <AnatomyPair load={load01} height={300} gap={10} maxWidth={winW - 64} />
            <Text
              style={{ ...type.caption, color: colors.muted, marginTop: space(3), textAlign: 'center' }}
              numberOfLines={2}
            >
              {topMuscles.length
                ? topMuscles.map((m: MuscleId) => MUSCLE_NAME[m]).join(' · ')
                : 'No muscle load recorded'}
            </Text>
          </Card>

          <SectionLabel
            right={
              <Text style={{ ...type.caption, color: colors.muted }}>
                {prCount > 0 ? `${prCount} PR · ` : ''}
                {summary.reps > 0
                  ? `${summary.reps} reps · `
                  : summary.distanceM > 0
                    ? `${num(Math.round(summary.distanceM))} m · `
                    : ''}
                {summary.exercises} {summary.exercises === 1 ? 'exercise' : 'exercises'}
              </Text>
            }
          >
            Exercises
          </SectionLabel>

          <View style={{ gap: space(2) }}>
            {groups.map(([exerciseId, list]) => {
              const exercise = getExercise(exerciseId);
              const isDistance = exercise.measure === 'distance';
              const volume = list.reduce((sum, s) => sum + s.weight * exercise.loadFactor * s.reps, 0);
              const distance = list.reduce((sum, s) => sum + (s.distance_m ?? 0), 0);
              return (
                <Card key={exerciseId} style={{ padding: space(3.5) }}>
                  <Pressable onPress={() => nav.push({ name: 'exercise', exerciseId })}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                    <Text style={{ ...type.body, color: colors.text, flex: 1 }} numberOfLines={1}>
                      {exercise.name}
                    </Text>
                    {prs.get(exerciseId)?.isPR ? (
                      <View
                        style={{
                          backgroundColor: colors.accent,
                          borderRadius: radius.sm,
                          paddingHorizontal: space(1.5),
                          paddingVertical: 2,
                        }}
                      >
                        <Text style={{ fontSize: 9.5, fontWeight: '900', color: '#fff', letterSpacing: 0.6 }}>
                          PR
                        </Text>
                      </View>
                    ) : null}
                    <Text style={{ ...type.caption, color: colors.muted, ...tabular }}>
                      {isDistance ? `${num(Math.round(distance))} m` : kgLabel(volume)}
                    </Text>
                  </View>
                  <View
                    style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5), marginTop: space(2) }}
                  >
                    {list.map((s, i) => (
                      <View
                        key={s.id}
                        style={{
                          borderRadius: radius.sm,
                          backgroundColor: colors.surfaceAlt,
                          paddingHorizontal: space(2.5),
                          paddingVertical: 5,
                          opacity: s.is_warmup ? 0.55 : 1,
                        }}
                      >
                        <Text style={{ fontSize: 11.5, color: colors.text, fontWeight: '700', ...tabular }}>
                          {isDistance
                            ? `${s.is_warmup ? 'W' : i + 1}. ${s.weight > 0 ? `${s.weight}kg × ` : ''}${s.distance_m ?? 0}m${
                                s.duration_s ? ` · ${duration(s.duration_s)}` : ''
                              }`
                            : `${s.is_warmup ? 'W' : i + 1}. ${s.weight}×${s.reps}${s.rpe ? ` @${s.rpe}` : ''}`}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {list.some((s) => s.note) ? (
                    <View style={{ marginTop: space(2.5), gap: 3 }}>
                      {list.map((s, i) =>
                        s.note ? (
                          <Text key={s.id} style={{ ...type.tiny, color: colors.muted }}>
                            {i + 1} · {s.note}
                          </Text>
                        ) : null,
                      )}
                    </View>
                  ) : null}
                  </Pressable>
                </Card>
              );
            })}
          </View>
        </>
      )}

      </Screen>

      <View
        style={{
          flexDirection: 'row',
          gap: space(3),
          paddingHorizontal: space(4),
          paddingTop: space(3),
          paddingBottom: space(5),
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        {!isRun ? (
          <Button
            label="Edit sets"
            icon="create-outline"
            variant="surface"
            onPress={() => nav.editSession(sessionId)}
            style={{ flex: 1 }}
          />
        ) : null}
        <Button
          label="Create a card"
          icon="share-social"
          onPress={() => nav.push({ name: 'share', id: sessionId })}
          style={{ flex: 1 }}
        />
      </View>

      <Modal visible={renaming} transparent animationType="fade" onRequestClose={() => setRenaming(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: space(6) }}
          onPress={() => setRenaming(false)}
        >
          <Pressable style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(5) }}>
            <Text style={{ ...type.title, color: colors.text }}>Name this session</Text>
            <Text style={{ ...type.caption, color: colors.muted, marginTop: 4 }}>
              Shown on the card, before or after you finish.
            </Text>
            <TextInput
              value={titleDraft}
              onChangeText={setTitleDraft}
              autoFocus
              placeholder="Afternoon Weight Training"
              placeholderTextColor={colors.faint}
              style={{
                marginTop: space(4),
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.md,
                paddingHorizontal: space(4),
                paddingVertical: 13,
                color: colors.text,
                fontSize: 16,
                fontWeight: '600',
              }}
            />
            <View style={{ flexDirection: 'row', gap: space(3), marginTop: space(4) }}>
              <Button label="Cancel" variant="ghost" onPress={() => setRenaming(false)} style={{ flex: 1 }} />
              <Button label="Save" onPress={saveTitle} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
