import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, IconButton, Screen, SectionLabel } from '../components/ui';
import { ExercisePicker } from '../components/ExercisePicker';
import { getExercise, type ExerciseDef } from '../data/exercises';
import { saveLift, lastWeightFor } from '../db/db';
import { duration, kgLabel, num, timeOfDay } from '../lib/format';
import { summarizeSets, type SetEntry } from '../lib/volume';
import { draftToSets, newKey, type LiftDraft, type Nav } from '../nav';
import { colors, radius, space, tabular, type } from '../theme';

export function LogScreen({
  nav,
  draft,
  setDraft,
}: {
  nav: Nav;
  draft: LiftDraft;
  setDraft: React.Dispatch<React.SetStateAction<LiftDraft>>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [saving, setSaving] = useState(false);
  const lastWeightCache = useRef<Record<string, number | null>>({});

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const sets: SetEntry[] = useMemo(() => draftToSets(draft), [draft]);
  const summary = useMemo(() => summarizeSets(sets), [sets]);

  const defaultTitle = `${timeOfDay(new Date(draft.startedAt))} Weight Training`;
  const title = draft.title.trim() ? draft.title : defaultTitle;

  const addExercise = useCallback(
    async (exercise: ExerciseDef) => {
      setPickerOpen(false);
      const prev = await lastWeightFor(exercise.id);
      const suggested = prev ?? (exercise.loadFactor === 0 ? 0 : exercise.equipment === 'barbell' ? 40 : 10);
      setDraft((d) => ({
        ...d,
        exercises: [
          ...d.exercises,
          {
            key: newKey(),
            exerciseId: exercise.id,
            sets: [{ key: newKey(), weight: String(suggested), reps: '8' }],
          },
        ],
      }));
    },
    [setDraft],
  );

  const updateSet = (exKey: string, setKey: string, patch: Partial<{ weight: string; reps: string }>) => {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((ex) =>
        ex.key !== exKey
          ? ex
          : { ...ex, sets: ex.sets.map((s) => (s.key === setKey ? { ...s, ...patch } : s)) },
      ),
    }));
  };

  const addSet = (exKey: string) => {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((ex) => {
        if (ex.key !== exKey) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, { key: newKey(), weight: last?.weight ?? '0', reps: last?.reps ?? '8' }],
        };
      }),
    }));
  };

  const removeSet = (exKey: string, setKey: string) => {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises
        .map((ex) => (ex.key !== exKey ? ex : { ...ex, sets: ex.sets.filter((s) => s.key !== setKey) }))
        .filter((ex) => ex.sets.length > 0),
    }));
  };

  const removeExercise = (exKey: string) => {
    setDraft((d) => ({ ...d, exercises: d.exercises.filter((ex) => ex.key !== exKey) }));
  };

  const finish = async () => {
    if (sets.length === 0) {
      Alert.alert('Nothing to save', 'Add at least one set with reps before finishing.');
      return;
    }
    setSaving(true);
    try {
      const id = await saveLift({
        title,
        startedAt: draft.startedAt,
        endedAt: Date.now(),
        sets,
      });
      setDraft({ startedAt: Date.now(), title: '', exercises: [] });
      nav.bump();
      nav.reset({ name: 'session', id });
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (draft.exercises.length === 0) {
      nav.back();
      return;
    }
    Alert.alert('Discard workout?', 'Your sets will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          setDraft({ startedAt: Date.now(), title: '', exercises: [] });
          nav.back();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        <Screen scroll contentStyle={{ paddingBottom: space(4) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
            <IconButton icon="chevron-back" onPress={discard} size={34} bg={colors.surface} />
            <Text style={{ ...type.caption, color: colors.muted }}>
              {duration((now - draft.startedAt) / 1000)} elapsed
            </Text>
            <View style={{ flex: 1 }} />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.accentDim,
                paddingHorizontal: space(3),
                paddingVertical: 5,
                borderRadius: radius.pill,
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
              <Text style={{ ...type.tiny, color: colors.accentText }}>LIVE</Text>
            </View>
          </View>

          <TextInput
            value={draft.title}
            onChangeText={(t) => setDraft((d) => ({ ...d, title: t }))}
            placeholder={defaultTitle}
            placeholderTextColor={colors.faint}
            style={{
              ...type.display,
              color: colors.text,
              marginTop: space(4),
              padding: 0,
            }}
          />

          {draft.exercises.length === 0 ? (
            <Card style={{ marginTop: space(6), alignItems: 'center', paddingVertical: space(7) }}>
              <Ionicons name="barbell-outline" size={28} color={colors.faint} />
              <Text style={{ ...type.body, color: colors.text, marginTop: space(2) }}>No exercises yet</Text>
              <Text style={{ ...type.caption, color: colors.muted, marginTop: 4, textAlign: 'center' }}>
                Pick a movement — we map every one to the muscles it works.
              </Text>
              <Button
                label="Add exercise"
                icon="add"
                onPress={() => setPickerOpen(true)}
                style={{ marginTop: space(4) }}
              />
            </Card>
          ) : (
            draft.exercises.map((block, index) => (
              <ExerciseBlock
                key={block.key}
                block={block}
                index={index}
                onAddSet={() => addSet(block.key)}
                onRemoveExercise={() => removeExercise(block.key)}
                onRemoveSet={(setKey) => removeSet(block.key, setKey)}
                onUpdateSet={(setKey, patch) => updateSet(block.key, setKey, patch)}
              />
            ))
          )}

          {draft.exercises.length > 0 ? (
            <Button
              label="Add exercise"
              icon="add"
              variant="ghost"
              onPress={() => setPickerOpen(true)}
              style={{ marginTop: space(3) }}
            />
          ) : null}
        </Screen>
      </View>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: space(4),
          paddingTop: space(3),
          paddingBottom: space(4),
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(4),
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.tiny, color: colors.faint }}>TOTAL VOLUME</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -1, ...tabular }}>
              {num(Math.round(summary.volume))}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted, marginLeft: 4 }}>kg</Text>
          </View>
          <Text style={{ ...type.tiny, color: colors.faint, marginTop: 1 }}>
            {summary.sets} sets · {summary.reps} reps · {summary.exercises} lifts
          </Text>
        </View>
        <Button label="Finish" icon="checkmark" onPress={finish} loading={saving} />
      </View>

      <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onPick={addExercise} />
    </View>
  );
}

function ExerciseBlock({
  block,
  index,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  onUpdateSet,
}: {
  block: { key: string; exerciseId: string; sets: { key: string; weight: string; reps: string }[] };
  index: number;
  onAddSet: () => void;
  onRemoveSet: (setKey: string) => void;
  onRemoveExercise: () => void;
  onUpdateSet: (setKey: string, patch: Partial<{ weight: string; reps: string }>) => void;
}) {
  const exercise = getExercise(block.exerciseId);

  const blockVolume = block.sets.reduce((sum, s) => {
    const w = Number.parseFloat(s.weight.replace(',', '.')) || 0;
    const r = Number.parseInt(s.reps, 10) || 0;
    return sum + w * exercise.loadFactor * r;
  }, 0);

  return (
    <Card style={{ marginTop: space(4), padding: 0 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: space(4),
          paddingTop: space(3.5),
          paddingBottom: space(2),
          gap: space(2),
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            backgroundColor: colors.surfaceHi,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted }}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.body, color: colors.text }} numberOfLines={1}>
            {exercise.name}
          </Text>
          <Text style={{ fontSize: 10.5, color: colors.faint, marginTop: 1 }}>
            {exercise.equipment}
            {exercise.loadFactor === 2 ? ' · weight per dumbbell' : ''}
            {exercise.isUnilateral ? ' · per side' : ''}
          </Text>
        </View>
        <Text style={{ ...type.caption, color: colors.muted, ...tabular }}>{kgLabel(blockVolume)}</Text>
        <Pressable onPress={onRemoveExercise} hitSlop={10} style={{ marginLeft: space(1) }}>
          <Ionicons name="trash-outline" size={16} color={colors.faint} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: space(4), paddingBottom: space(3) }}>
        <View style={{ flexDirection: 'row', gap: space(2), marginBottom: space(1.5), alignItems: 'center' }}>
          <Text style={{ ...type.tiny, color: colors.faint, width: 22 }}>SET</Text>
          <Text style={{ ...type.tiny, color: colors.faint, flex: 1 }}>WEIGHT KG</Text>
          <Text style={{ ...type.tiny, color: colors.faint, width: 12 }} />
          <Text style={{ ...type.tiny, color: colors.faint, width: 56, textAlign: 'center' }}>REPS</Text>
          <Text style={{ ...type.tiny, color: colors.faint, width: 62, textAlign: 'right' }}>TOTAL</Text>
          <View style={{ width: 15 }} />
        </View>

        {block.sets.map((set, i) => {
          const w = Number.parseFloat(set.weight.replace(',', '.')) || 0;
          const r = Number.parseInt(set.reps, 10) || 0;
          return (
            <View
              key={set.key}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space(2), marginTop: space(2) }}
            >
              <Text style={{ ...type.caption, color: colors.muted, width: 22, ...tabular }}>{i + 1}</Text>
              <TextInput
                value={set.weight}
                onChangeText={(t) => onUpdateSet(set.key, { weight: t })}
                keyboardType="decimal-pad"
                selectTextOnFocus
                style={[inputStyle, { flex: 1 }]}
              />
              <Text style={{ color: colors.faint, fontSize: 12, width: 12, textAlign: 'center' }}>×</Text>
              <TextInput
                value={set.reps}
                onChangeText={(t) => onUpdateSet(set.key, { reps: t })}
                keyboardType="number-pad"
                selectTextOnFocus
                style={[inputStyle, { width: 56 }]}
              />
              <Text style={{ ...type.tiny, color: colors.faint, width: 62, textAlign: 'right', ...tabular }}>
                {w * exercise.loadFactor * r >= 1000
                  ? `${((w * exercise.loadFactor * r) / 1000).toFixed(1)}k`
                  : Math.round(w * exercise.loadFactor * r)}
              </Text>
              <Pressable onPress={() => onRemoveSet(set.key)} hitSlop={10} style={{ width: 15 }}>
                <Ionicons name="close" size={15} color={colors.faint} />
              </Pressable>
            </View>
          );
        })}

        <Pressable
          onPress={onAddSet}
          style={({ pressed }) => ({
            marginTop: space(3),
            paddingVertical: space(2.5),
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.border,
            borderStyle: 'dashed',
            alignItems: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ ...type.caption, color: colors.accentText }}>+ Add set</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const inputStyle = {
  backgroundColor: colors.surfaceAlt,
  borderRadius: radius.sm,
  paddingHorizontal: space(2),
  paddingVertical: 9,
  color: colors.text,
  fontSize: 15,
  fontWeight: '700' as const,
  textAlign: 'center' as const,
};
