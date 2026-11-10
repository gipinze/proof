import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Empty, IconButton, Screen, SectionLabel, TOP_INSET } from '../components/ui';
import { getExercise } from '../data/exercises';
import { MUSCLE_NAME } from '../data/muscles';
import { allExerciseNotes, exerciseHistory, type ExerciseSessionRow } from '../db/db';
import { ExerciseNoteSheet } from '../components/ExerciseNoteSheet';
import { kgLabel, num, relativeDay } from '../lib/format';
import type { Nav } from '../nav';
import { colors, radius, space, tabular, type } from '../theme';

/**
 * One exercise across time: what the estimated 1RM did, session by session.
 * This is the question the app could not answer before — the session screen
 * only ever showed the day you were looking at.
 */
export function ExerciseScreen({
  nav,
  exerciseId,
}: {
  nav: Nav;
  exerciseId: string;
}) {
  const exercise = getExercise(exerciseId);
  const [rows, setRows] = useState<ExerciseSessionRow[]>([]);
  const [preNote, setPreNote] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const notes = await allExerciseNotes();
    setPreNote(notes[exerciseId] ?? '');
    setRows(await exerciseHistory(exerciseId));
    setLoaded(true);
  }, [exerciseId]);

  useEffect(() => {
    load().catch(() => setLoaded(true));
  }, [load, nav.dataVersion]);

  // oldest → newest for the chart, newest first for the list
  const chronological = useMemo(() => [...rows].reverse(), [rows]);
  const best = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.best1rm), 0),
    [rows],
  );
  const first = chronological[0];
  const last = chronological[chronological.length - 1];
  const change = first && last && first.best1rm > 0 ? (last.best1rm - first.best1rm) / first.best1rm : null;
  const isDistance = exercise.measure === 'distance';

  const chart = chronological.slice(-12);
  const chartMax = Math.max(1, ...chart.map((row) => row.best1rm));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: TOP_INSET,
          paddingHorizontal: space(4),
          paddingBottom: space(2),
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(3),
        }}
      >
        <IconButton icon="chevron-back" onPress={nav.back} size={34} bg={colors.surface} />
        <Text style={{ ...type.title, color: colors.text, flex: 1 }} numberOfLines={2}>
          {exercise.name}
        </Text>
      </View>

      <Screen scroll contentStyle={{ paddingBottom: space(24) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2), marginTop: space(2) }}>
          <Ionicons name="barbell-outline" size={13} color={colors.faint} />
          <Text style={{ ...type.tiny, color: colors.faint, textTransform: 'uppercase' }}>
            {exercise.equipment} · {Object.values(exercise.muscles).length} muscles
          </Text>
        </View>

        <Pressable
          onPress={() => setSheetOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space(2),
            marginTop: space(3),
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: space(3.5),
            paddingVertical: space(2.5),
          }}
        >
          <Ionicons name={preNote ? 'flag' : 'flag-outline'} size={14} color={preNote ? colors.accentText : colors.faint} />
          <Text
            style={{ ...type.caption, color: preNote ? colors.text : colors.faint, flex: 1 }}
            numberOfLines={2}
          >
            {preNote || 'Add a pre-note or target'}
          </Text>
          <Ionicons name="create-outline" size={13} color={colors.faint} />
        </Pressable>

        <ExerciseNoteSheet
          visible={sheetOpen}
          exerciseId={exerciseId}
          exerciseName={exercise.name}
          initial={preNote}
          onClose={() => setSheetOpen(false)}
          onSaved={setPreNote}
        />

        {!loaded ? null : rows.length === 0 ? (
          <Empty
            icon="stats-chart-outline"
            title="Nothing logged yet"
            body="Train this lift once and the trend starts here."
          />
        ) : (
          <>
            <Card style={{ marginTop: space(4), padding: space(4) }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space(2) }}>
                <Text style={{ ...type.display, color: colors.text }}>
                  {isDistance ? num(Math.round(last.distanceM)) : num(Math.round(best))}
                </Text>
                <Text style={{ ...type.caption, color: colors.muted, marginBottom: 6 }}>
                  {isDistance ? 'm best' : 'kg best est. 1RM'}
                </Text>
                {change !== null ? (
                  <View
                    style={{
                      marginLeft: 'auto',
                      marginBottom: 4,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                      backgroundColor: change >= 0 ? colors.accentDim : colors.surfaceAlt,
                      borderRadius: radius.pill,
                      paddingHorizontal: space(2.5),
                      paddingVertical: 3,
                    }}
                  >
                    <Ionicons
                      name={change >= 0 ? 'trending-up' : 'trending-down'}
                      size={11}
                      color={change >= 0 ? colors.accentText : colors.muted}
                    />
                    <Text
                      style={{
                        ...type.tiny,
                        color: change >= 0 ? colors.accentText : colors.muted,
                        ...tabular,
                      }}
                    >
                      {change >= 0 ? '+' : ''}
                      {Math.round(change * 100)}%
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ ...type.tiny, color: colors.faint, marginTop: 2 }}>
                {rows.length} {rows.length === 1 ? 'session' : 'sessions'} · since {fullDateShort(first.startedAt)}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: 4,
                  height: 74,
                  marginTop: space(4),
                }}
              >
                {chart.map((row, index) => {
                  const height = Math.max(5, Math.round((row.best1rm / chartMax) * 64));
                  const isLast = index === chart.length - 1;
                  return (
                    <View key={row.sessionId} style={{ flex: 1, alignItems: 'center' }}>
                      <View
                        style={{
                          width: '100%',
                          height,
                          borderRadius: 3,
                          backgroundColor: isLast ? colors.accent : colors.surfaceHi,
                        }}
                      />
                    </View>
                  );
                })}
              </View>
            </Card>

            <SectionLabel>Every session</SectionLabel>
            {rows.map((row) => (
              <Card
                key={row.sessionId}
                style={{ padding: space(3.5), marginBottom: space(2) }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                  <Text style={{ ...type.caption, color: colors.muted, width: 78 }} numberOfLines={1}>
                    {relativeDay(row.startedAt)}
                  </Text>
                  <Text style={{ ...type.caption, color: colors.text, flex: 1 }} numberOfLines={1}>
                    {row.title}
                  </Text>
                  <Text style={{ ...type.caption, color: colors.text, ...tabular }}>
                    {isDistance
                      ? `${num(Math.round(row.distanceM))} m`
                      : `${row.bestWeight}×${row.bestReps}`}
                  </Text>
                </View>
                <Text style={{ ...type.tiny, color: colors.faint, marginTop: 3 }}>
                  {row.sets} {row.sets === 1 ? 'set' : 'sets'} · {isDistance ? `${num(Math.round(row.distanceM))} m` : kgLabel(row.volume)}
                  {!isDistance ? ` · est. 1RM ${num(Math.round(row.best1rm))} kg` : ''}
                  {row.topRpe ? ` · RPE ${row.topRpe}` : ''}
                </Text>
              </Card>
            ))}
          </>
        )}
      </Screen>
    </View>
  );
}

function fullDateShort(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
