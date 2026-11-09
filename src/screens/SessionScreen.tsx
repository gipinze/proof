import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnatomyPair } from '../components/AnatomyMap';
import { RouteMap } from '../components/RouteMap';
import { Button, Card, IconButton, Screen, SectionLabel, Stat } from '../components/ui';
import { getExercise } from '../data/exercises';
import { MUSCLE_NAME } from '../data/muscles';
import type { MuscleId } from '../data/anatomy';
import { deleteSession, getSession, getSessionSets, type SessionRow, type StoredSet } from '../db/db';
import { duration, fullDate, km, kgLabel, num, pace, paceFrom, timeOfDay } from '../lib/format';
import { muscleLoad, normalisedLoad, rankedMuscles, summarizeSets, type SetEntry } from '../lib/volume';
import type { TrackPoint } from '../lib/geo';
import type { Nav } from '../nav';
import { colors, radius, space, tabular, type } from '../theme';

export function SessionScreen({ nav, sessionId }: { nav: Nav; sessionId: number }) {
  const { width: winW } = useWindowDimensions();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [sets, setSets] = useState<StoredSet[]>([]);

  const load = useCallback(async () => {
    const row = await getSession(sessionId);
    setSession(row);
    if (row?.kind === 'lift') setSets(await getSessionSets(sessionId));
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

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
        <IconButton icon="chevron-back" onPress={nav.back} size={34} bg={colors.surface} />
        <Text style={{ ...type.caption, color: colors.muted, flex: 1 }}>{fullDate(session.started_at)}</Text>
        <IconButton icon="share-outline" onPress={() => nav.push({ name: 'share', id: sessionId })} size={34} bg={colors.surface} />
        <IconButton icon="trash-outline" onPress={remove} size={34} bg={colors.surface} />
      </View>

      <Text style={{ ...type.display, color: colors.text, marginTop: space(5) }}>{session.title}</Text>

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
            <Stat label="Volume" value={num(Math.round(summary.volume))} unit="kg" size="lg" />
            <Stat label="Sets" value={`${summary.sets}`} size="lg" />
            <Stat label="Time" value={duration(seconds)} size="lg" />
          </View>

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
                {summary.reps} reps · {summary.exercises} exercises
              </Text>
            }
          >
            Exercises
          </SectionLabel>

          <View style={{ gap: space(2) }}>
            {groups.map(([exerciseId, list]) => {
              const exercise = getExercise(exerciseId);
              const volume = list.reduce(
                (sum, s) => sum + s.weight * exercise.loadFactor * s.reps,
                0,
              );
              return (
                <Card key={exerciseId} style={{ padding: space(3.5) }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ ...type.body, color: colors.text, flex: 1 }}>{exercise.name}</Text>
                    <Text style={{ ...type.caption, color: colors.muted, ...tabular }}>
                      {kgLabel(volume)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5), marginTop: space(2) }}>
                    {list.map((s, i) => (
                      <View
                        key={s.id}
                        style={{
                          borderRadius: radius.sm,
                          backgroundColor: colors.surfaceAlt,
                          paddingHorizontal: space(2.5),
                          paddingVertical: 5,
                        }}
                      >
                        <Text style={{ fontSize: 11.5, color: colors.text, fontWeight: '700', ...tabular }}>
                          {i + 1}. {s.weight}×{s.reps}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              );
            })}
          </View>
        </>
      )}

      <View style={{ flexDirection: 'row', gap: space(3), marginTop: space(7) }}>
        <Button
          label="Create a card"
          icon="share-social"
          onPress={() => nav.push({ name: 'share', id: sessionId })}
          style={{ flex: 1 }}
        />
        <Button label="Done" variant="ghost" onPress={nav.back} style={{ flex: 1 }} />
      </View>

      <Pressable onPress={() => nav.reset({ name: 'home' })} style={{ marginTop: space(5), alignSelf: 'center' }}>
        <Text style={{ ...type.caption, color: colors.faint }}>Back to home</Text>
      </Pressable>
    </Screen>
  );
}
