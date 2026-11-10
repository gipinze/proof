import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, IconButton, Screen } from '../components/ui';
import { ExercisePicker } from '../components/ExercisePicker';
import { getExercise, type ExerciseDef } from '../data/exercises';
import { ExerciseNoteSheet } from '../components/ExerciseNoteSheet';
import { allExerciseNotes, lastDistanceFor, lastWeightFor, saveLift, saveTemplate, updateLift } from '../db/db';
import { duration, kgLabel, num, parseTime, timeOfDay } from '../lib/format';
import { BAR_KG, platesPerSide } from '../lib/plates';
import { summarizeSets, type SetEntry } from '../lib/volume';
import { draftToSets, newKey, type DraftExercise, type DraftSet, type LiftDraft, type Nav } from '../nav';
import { useBottomInset } from '../lib/insets';
import { colors, radius, space, tabular, type } from '../theme';

export function LogScreen({
  nav,
  draft,
  setDraft,
  editId,
}: {
  nav: Nav;
  draft: LiftDraft;
  setDraft: React.Dispatch<React.SetStateAction<LiftDraft>>;
  editId?: number;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const insets = { bottom: useBottomInset() };
  const [saving, setSaving] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [rpeTarget, setRpeTarget] = useState<{ exKey: string; setKey: string } | null>(null);
  const [noteTarget, setNoteTarget] = useState<{ exKey: string; setKey: string } | null>(null);
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [noteSheet, setNoteSheet] = useState<{ exerciseId: string; name: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [platesOpen, setPlatesOpen] = useState(false);
  const [plateTarget, setPlateTarget] = useState('100');
  const BAR_KG = 20;
  /** Rest countdown, in ms remaining; null when idle. */
  const [restLeft, setRestLeft] = useState<number | null>(null);
  const REST_MS = 90_000;
  /** Edit mode: extend the session end time to "now" instead of keeping it. */
  const [extendToNow, setExtendToNow] = useState(false);
  const lastWeightCache = useRef<Record<string, number | null>>({});

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    allExerciseNotes()
      .then(setExerciseNotes)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (restLeft === null) return;
    const id = setInterval(() => {
      setRestLeft((left) => {
        if (left === null) return null;
        const next = left - 500;
        if (next <= 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          return null;
        }
        return next;
      });
    }, 500);
    return () => clearInterval(id);
  }, [restLeft === null]);

  const sets: SetEntry[] = useMemo(() => draftToSets(draft), [draft]);
  const summary = useMemo(() => summarizeSets(sets), [sets]);

  const defaultTitle = `${timeOfDay(new Date(draft.startedAt))} Weight Training`;
  const title = draft.title.trim() ? draft.title : defaultTitle;

  const addExercise = useCallback(
    async (exercise: ExerciseDef) => {
      setPickerOpen(false);
      const [prevWeight, prevDistance] = await Promise.all([
        lastWeightFor(exercise.id),
        lastDistanceFor(exercise.id),
      ]);
      lastWeightCache.current[exercise.id] = prevWeight;

      const isDistance = exercise.measure === 'distance';
      const suggestedWeight =
        prevWeight ?? (exercise.loadFactor === 0 ? 0 : exercise.equipment === 'barbell' ? 40 : 10);

      setDraft((d) => ({
        ...d,
        exercises: [
          ...d.exercises,
          {
            key: newKey(),
            exerciseId: exercise.id,
            sets: [
              {
                key: newKey(),
                weight: String(isDistance && exercise.loadFactor === 0 ? 0 : suggestedWeight),
                reps: '8',
                distance: String(prevDistance ?? (isDistance ? 20 : 0)),
                time: '',
                rpe: '',
                note: '',
                isWarmup: false,
              },
            ],
          },
        ],
      }));
    },
    [setDraft],
  );

  const updateSet = (exKey: string, setKey: string, patch: Partial<DraftSet>) => {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((ex) =>
        ex.key !== exKey
          ? ex
          : { ...ex, sets: ex.sets.map((s) => (s.key === setKey ? { ...s, ...patch } : s)) },
      ),
    }));
  };

  const startRest = () => setRestLeft(REST_MS);

  /** Long-press a set to jot something down about it. */
  const openNote = (exKey: string, setKey: string) => {
    const block = draft.exercises.find((b) => b.key === exKey);
    const set = block?.sets.find((s) => s.key === setKey);
    setNoteDraft(set?.note ?? '');
    setNoteTarget({ exKey, setKey });
  };

  const addSet = (exKey: string) => {
    startRest();
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((ex) => {
        if (ex.key !== exKey) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              key: newKey(),
              weight: last?.weight ?? '0',
              reps: last?.reps ?? '8',
              distance: last?.distance ?? '20',
              time: last?.time ?? '',
              rpe: last?.rpe ?? '',
              note: '',
              isWarmup: false,
            },
          ],
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

  const saveAsTemplate = async () => {
    const name = templateName.trim();
    if (!name) {
      setTemplateOpen(false);
      return;
    }
    const exercises = draft.exercises.map((block) => ({
      exerciseId: block.exerciseId,
      sets: block.sets.map((s) => ({
        weight: Number.parseFloat(s.weight.replace(',', '.')) || 0,
        reps: Number.parseInt(s.reps, 10) || 0,
        distanceM: Number.parseFloat(s.distance.replace(',', '.')) || undefined,
        durationS: parseTime(s.time) || undefined,
        rpe: Number.parseFloat(s.rpe) || undefined,
        note: s.note.trim() || undefined,
      })),
    }));
    await saveTemplate(name, exercises);
    setTemplateOpen(false);
    Alert.alert('Template saved', 'Reuse it from Home next time.');
  };

  const finish = async () => {
    if (sets.length === 0) {
      Alert.alert('Nothing to save', 'Add at least one set with reps or distance before finishing.');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        // keep the original finish time unless the user says they are still going
        await updateLift(editId, {
          title,
          sets,
          ...(extendToNow ? { endedAt: Date.now() } : {}),
        });
        setDraft({ startedAt: Date.now(), title: '', exercises: [] });
        nav.bump();
        nav.reset({ name: 'session', id: editId });
      } else {
        const id = await saveLift({ title, startedAt: draft.startedAt, endedAt: Date.now(), sets });
        setDraft({ startedAt: Date.now(), title: '', exercises: [] });
        nav.bump();
        nav.reset({ name: 'session', id });
      }
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
    Alert.alert(editId ? 'Discard changes?' : 'Discard workout?', 'Your edits will be lost.', [
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
        <Screen scroll contentStyle={{ paddingBottom: space(24) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
            <IconButton icon="chevron-back" onPress={discard} size={34} bg={colors.surface} />
            {editId ? (
              <Pressable
                onPress={() => setExtendToNow((v) => !v)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: extendToNow ? colors.accentDim : colors.surfaceAlt,
                  borderRadius: radius.pill,
                  paddingHorizontal: space(3),
                  paddingVertical: 6,
                }}
              >
                <Ionicons
                  name={extendToNow ? 'time' : 'time-outline'}
                  size={13}
                  color={extendToNow ? colors.accentText : colors.muted}
                />
                <Text
                  style={{
                    ...type.caption,
                    color: extendToNow ? colors.accentText : colors.muted,
                  }}
                >
                  {extendToNow ? 'Ends when I save' : 'Keep old end time'}
                </Text>
              </Pressable>
            ) : (
              <Text style={{ ...type.caption, color: colors.muted }}>
                {`${duration((now - draft.startedAt) / 1000)} elapsed`}
              </Text>
            )}
            <View style={{ flex: 1 }} />

            <Pressable
              onPress={() => (restLeft === null ? startRest() : setRestLeft(null))}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: restLeft !== null ? colors.accentDim : colors.surface,
                borderRadius: radius.pill,
                paddingHorizontal: space(2.5),
                paddingVertical: 6,
              }}
            >
              <Ionicons
                name={restLeft !== null ? 'timer' : 'timer-outline'}
                size={13}
                color={restLeft !== null ? colors.accentText : colors.muted}
              />
              <Text
                style={{
                  ...type.caption,
                  color: restLeft !== null ? colors.accentText : colors.muted,
                  ...tabular,
                }}
              >
                {restLeft !== null ? duration(restLeft / 1000) : 'Rest'}
              </Text>
            </Pressable>

            {draft.exercises.length > 0 ? (
              <Pressable
                onPress={() => {
                  setTemplateName(draft.title.trim() || defaultTitle);
                  setTemplateOpen(true);
                }}
                hitSlop={8}
                style={{ paddingHorizontal: space(1.5) }}
              >
                <Ionicons name="bookmark-outline" size={18} color={colors.muted} />
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                const lastSet = draft.exercises[draft.exercises.length - 1]?.sets.slice(-1)[0];
                setPlateTarget(lastSet?.weight || '100');
                setPlatesOpen(true);
              }}
              hitSlop={8}
              style={{ paddingHorizontal: space(1.5) }}
            >
              <Ionicons name="calculator-outline" size={18} color={colors.muted} />
            </Pressable>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: editId ? colors.surfaceAlt : colors.accentDim,
                paddingHorizontal: space(3),
                paddingVertical: 5,
                borderRadius: radius.pill,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: editId ? colors.muted : colors.accent,
                }}
              />
              <Text style={{ ...type.tiny, color: editId ? colors.muted : colors.accentText }}>
                {editId ? 'EDITING' : 'LIVE'}
              </Text>
            </View>
          </View>

          <TextInput
            value={draft.title}
            onChangeText={(t) => setDraft((d) => ({ ...d, title: t }))}
            placeholder={defaultTitle}
            placeholderTextColor={colors.faint}
            style={{ ...type.display, color: colors.text, marginTop: space(4), padding: 0 }}
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
                onSetRpe={(setKey) => setRpeTarget({ exKey: block.key, setKey })}
                onEditNote={(setKey) => openNote(block.key, setKey)}
                preNote={exerciseNotes[block.exerciseId] ?? ''}
                onEditPreNote={() =>
                  setNoteSheet({ exerciseId: block.exerciseId, name: getExercise(block.exerciseId).name })
                }
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
          paddingBottom: insets.bottom + space(3),
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
            {summary.sets} sets · {summary.reps} reps
            {summary.distanceM > 0 ? ` · ${num(Math.round(summary.distanceM))} m` : ''}
          </Text>
        </View>
        <Button
          label={editId ? 'Save' : 'Finish'}
          icon="checkmark"
          onPress={finish}
          loading={saving}
        />
      </View>

      <Modal
        visible={platesOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPlatesOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: space(6) }}
          onPress={() => setPlatesOpen(false)}
        >
          <Pressable style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(5) }}>
            <Text style={{ ...type.title, color: colors.text }}>Plate maths</Text>
            <Text style={{ ...type.caption, color: colors.muted, marginTop: 4 }}>
              What to hang on each side of a {BAR_KG} kg bar.
            </Text>
            <TextInput
              value={plateTarget}
              onChangeText={setPlateTarget}
              keyboardType="decimal-pad"
              placeholder="100"
              placeholderTextColor={colors.faint}
              style={{
                marginTop: space(4),
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.md,
                paddingHorizontal: space(4),
                paddingVertical: 13,
                color: colors.text,
                fontSize: 22,
                fontWeight: '800',
              }}
            />
            {(() => {
              const target = Number.parseFloat(plateTarget.replace(',', '.')) || 0;
              const { plates, leftover } = platesPerSide(target, BAR_KG);
              return (
                <View style={{ marginTop: space(4) }}>
                  <Text style={{ ...type.tiny, color: colors.faint }}>PER SIDE</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(2) }}>
                    {plates.length === 0 ? (
                      <Text style={{ ...type.caption, color: colors.muted }}>
                        {target <= BAR_KG ? 'Just the bar, or lighter.' : 'No plates fit.'}
                      </Text>
                    ) : (
                      plates.map((size, index) => (
                        <View
                          key={size + '-' + index}
                          style={{
                            backgroundColor: colors.accentDim,
                            borderRadius: radius.pill,
                            paddingHorizontal: space(3),
                            paddingVertical: 6,
                          }}
                        >
                          <Text style={{ ...type.caption, color: colors.accentText, fontWeight: '800' }}>
                            {size}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                  {leftover > 0 ? (
                    <Text style={{ ...type.tiny, color: colors.muted, marginTop: space(2) }}>
                      {leftover.toFixed(2)} kg per side can’t be made with standard plates.
                    </Text>
                  ) : null}
                </View>
              );
            })()}
            <Button label="Done" onPress={() => setPlatesOpen(false)} style={{ marginTop: space(4) }} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={noteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setNoteTarget(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: space(6) }}
          onPress={() => setNoteTarget(null)}
        >
          <Pressable style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(5) }}>
            <Text style={{ ...type.title, color: colors.text }}>Note for this set</Text>
            <Text style={{ ...type.caption, color: colors.muted, marginTop: 4 }}>
              Grip, tempo, a twinge — anything you want to remember next time.
            </Text>
            <TextInput
              value={noteDraft}
              onChangeText={setNoteDraft}
              autoFocus
              multiline
              placeholder="Thumb tape slipped on rep 4"
              placeholderTextColor={colors.faint}
              style={{
                marginTop: space(4),
                minHeight: 84,
                textAlignVertical: 'top',
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.md,
                paddingHorizontal: space(4),
                paddingVertical: 12,
                color: colors.text,
                fontSize: 15,
                fontWeight: '500',
              }}
            />
            <View style={{ flexDirection: 'row', gap: space(3), marginTop: space(4) }}>
              <Button
                label="Clear"
                variant="ghost"
                onPress={() => {
                  if (!noteTarget) return;
                  updateSet(noteTarget.exKey, noteTarget.setKey, { note: '' });
                  setNoteTarget(null);
                }}
                style={{ flex: 1 }}
              />
              <Button
                label="Save"
                onPress={() => {
                  if (!noteTarget) return;
                  updateSet(noteTarget.exKey, noteTarget.setKey, { note: noteDraft.trim() });
                  setNoteTarget(null);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={rpeTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRpeTarget(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: space(6) }}
          onPress={() => setRpeTarget(null)}
        >
          <Pressable style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(5) }}>
            <Text style={{ ...type.title, color: colors.text }}>Effort for this set</Text>
            <Text style={{ ...type.caption, color: colors.muted, marginTop: 4 }}>
              RPE — how hard did that set feel? 6 is “could do a few more”, 10 is a grinder.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(4) }}>
              {[6, 7, 8, 9, 10].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => {
                    if (!rpeTarget) return;
                    updateSet(rpeTarget.exKey, rpeTarget.setKey, { rpe: String(value) });
                    setRpeTarget(null);
                  }}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: radius.md,
                    backgroundColor: colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ ...type.body, color: colors.text, fontWeight: '800' }}>{value}</Text>
                </Pressable>
              ))}
            </View>
            <Button
              label="Clear RPE"
              variant="ghost"
              onPress={() => {
                if (!rpeTarget) return;
                updateSet(rpeTarget.exKey, rpeTarget.setKey, { rpe: '' });
                setRpeTarget(null);
              }}
              style={{ marginTop: space(4) }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={templateOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTemplateOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: space(6) }}
          onPress={() => setTemplateOpen(false)}
        >
          <Pressable style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(5) }}>
            <Text style={{ ...type.title, color: colors.text }}>Save as template</Text>
            <Text style={{ ...type.caption, color: colors.muted, marginTop: 4 }}>
              Keeps these exercises and their last weights, ready to start again.
            </Text>
            <TextInput
              value={templateName}
              onChangeText={setTemplateName}
              autoFocus
              placeholder="Push A"
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
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setTemplateOpen(false)}
                style={{ flex: 1 }}
              />
              <Button label="Save" onPress={saveAsTemplate} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ExerciseNoteSheet
        visible={noteSheet !== null}
        exerciseId={noteSheet?.exerciseId ?? null}
        exerciseName={noteSheet?.name}
        initial={noteSheet ? exerciseNotes[noteSheet.exerciseId] ?? '' : ''}
        onClose={() => setNoteSheet(null)}
        onSaved={(note) =>
          setExerciseNotes((current) => {
            const next = { ...current };
            if (note) next[noteSheet?.exerciseId ?? ''] = note;
            else delete next[noteSheet?.exerciseId ?? ''];
            return next;
          })
        }
      />

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
  onSetRpe,
  onEditNote,
  preNote,
  onEditPreNote,
}: {
  block: DraftExercise;
  index: number;
  onAddSet: () => void;
  onRemoveSet: (setKey: string) => void;
  onRemoveExercise: () => void;
  onUpdateSet: (setKey: string, patch: Partial<DraftSet>) => void;
  onSetRpe: (setKey: string) => void;
  onEditNote: (setKey: string) => void;
  preNote: string;
  onEditPreNote: () => void;
}) {
  const exercise = getExercise(block.exerciseId);
  const isDistance = exercise.measure === 'distance';
  const hasLoad = exercise.loadFactor > 0;

  const totals = block.sets.reduce(
    (acc, s) => {
      const w = Number.parseFloat(s.weight.replace(',', '.')) || 0;
      const r = Number.parseInt(s.reps, 10) || 0;
      const d = Number.parseFloat(s.distance.replace(',', '.')) || 0;
      if (isDistance) {
        acc.distance += d;
        acc.seconds += parseTime(s.time);
      } else {
        acc.volume += w * exercise.loadFactor * r;
      }
      return acc;
    },
    { volume: 0, distance: 0, seconds: 0 },
  );

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
            {isDistance ? ' · distance' : ''}
          </Text>
          {preNote ? (
            <Pressable onPress={onEditPreNote} hitSlop={6} style={{ flexDirection: 'row', gap: 4, marginTop: 3 }}>
              <Ionicons name="flag-outline" size={10} color={colors.accentText} style={{ marginTop: 1 }} />
              <Text style={{ fontSize: 10.5, color: colors.accentText, flex: 1 }} numberOfLines={2}>
                {preNote}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={onEditPreNote} hitSlop={8} style={{ paddingHorizontal: space(1) }}>
          <Ionicons
            name={preNote ? 'flag' : 'flag-outline'}
            size={14}
            color={preNote ? colors.accentText : colors.faint}
          />
        </Pressable>
        <Text style={{ ...type.caption, color: colors.muted, ...tabular }}>
          {isDistance
            ? `${num(Math.round(totals.distance))} m${totals.seconds > 0 ? ` · ${duration(totals.seconds)}` : ''}`
            : kgLabel(totals.volume)}
        </Text>
        <Pressable onPress={onRemoveExercise} hitSlop={10} style={{ marginLeft: space(1) }}>
          <Ionicons name="trash-outline" size={16} color={colors.faint} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: space(4), paddingBottom: space(3) }}>
        <View style={{ flexDirection: 'row', gap: space(2), marginBottom: space(1.5), alignItems: 'center' }}>
          <Text style={{ ...type.tiny, color: colors.faint, width: 22 }}>SET</Text>
          {isDistance && hasLoad ? (
            <Text style={{ ...type.tiny, color: colors.faint, flex: 1 }}>WEIGHT KG</Text>
          ) : null}
          {isDistance ? (
            <>
              <Text
                style={{
                  ...type.tiny,
                  color: colors.faint,
                  flex: hasLoad ? 0 : 1,
                  width: hasLoad ? 88 : undefined,
                  textAlign: hasLoad ? 'center' : 'left',
                }}
              >
                DIST M
              </Text>
              <Text style={{ ...type.tiny, color: colors.faint, width: 62, textAlign: 'center' }}>TIME</Text>
            </>
          ) : (
            <>
              <Text style={{ ...type.tiny, color: colors.faint, flex: 1 }}>WEIGHT KG</Text>
              <Text style={{ ...type.tiny, color: colors.faint, width: 12 }} />
              <Text style={{ ...type.tiny, color: colors.faint, width: 56, textAlign: 'center' }}>REPS</Text>
            </>
          )}
          <Text style={{ ...type.tiny, color: colors.faint, width: 56, textAlign: 'right' }}>
            {isDistance ? (hasLoad ? 'LOAD·M' : '') : 'TOTAL'}
          </Text>
          <View style={{ width: 15 }} />
        </View>

        {block.sets.map((set, i) => {
          const w = Number.parseFloat(set.weight.replace(',', '.')) || 0;
          const r = Number.parseInt(set.reps, 10) || 0;
          const d = Number.parseFloat(set.distance.replace(',', '.')) || 0;
          const setVolume = w * exercise.loadFactor * r;
          const setLoadDistance = w * exercise.loadFactor * d;

          return (
            <Pressable
              key={set.key}
              onLongPress={() => onEditNote(set.key)}
              delayLongPress={350}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space(2),
                marginTop: space(2),
                opacity: set.isWarmup ? 0.55 : 1,
              }}
            >
              <Pressable
                onPress={() => onUpdateSet(set.key, { isWarmup: !set.isWarmup })}
                hitSlop={8}
                style={{ width: 26, flexDirection: 'row', alignItems: 'center', gap: 2 }}
              >
                <Text
                  style={{
                    ...type.caption,
                    color: set.isWarmup ? colors.faint : colors.muted,
                    ...tabular,
                  }}
                >
                  {set.isWarmup ? 'W' : i + 1}
                </Text>
                {set.note ? <Ionicons name="document-text" size={10} color={colors.accentText} /> : null}
              </Pressable>

              {isDistance ? (
                <>
                  {hasLoad ? (
                    <TextInput
                      value={set.weight}
                      onChangeText={(t) => onUpdateSet(set.key, { weight: t })}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                      style={[inputStyle, { flex: 1 }]}
                    />
                  ) : null}
                  <TextInput
                    value={set.distance}
                    onChangeText={(t) => onUpdateSet(set.key, { distance: t })}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    style={[inputStyle, hasLoad ? { width: 88 } : { flex: 1 }]}
                  />
                  <TextInput
                    value={set.time}
                    onChangeText={(t) => onUpdateSet(set.key, { time: t })}
                    placeholder="0:00"
                    placeholderTextColor={colors.faint}
                    keyboardType="numbers-and-punctuation"
                    selectTextOnFocus
                    style={[inputStyle, { width: 62 }]}
                  />
                  <Pressable onPress={() => onSetRpe(set.key)} hitSlop={6} style={{ width: 30, alignItems: 'center' }}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: set.rpe ? colors.accentText : colors.faint,
                      }}
                    >
                      {set.rpe ? '@' + set.rpe : 'RPE'}
                    </Text>
                  </Pressable>
                  <Text style={{ ...type.tiny, color: colors.faint, width: 56, textAlign: 'right', ...tabular }}>
                    {hasLoad
                      ? setLoadDistance >= 1000
                        ? `${(setLoadDistance / 1000).toFixed(1)}k`
                        : Math.round(setLoadDistance)
                      : ''}
                  </Text>
                </>
              ) : (
                <>
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
                  <Pressable onPress={() => onSetRpe(set.key)} hitSlop={6} style={{ width: 34, alignItems: 'center' }}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: set.rpe ? colors.accentText : colors.faint,
                      }}
                    >
                      {set.rpe ? '@' + set.rpe : 'RPE'}
                    </Text>
                  </Pressable>
                  <Text style={{ ...type.tiny, color: colors.faint, width: 62, textAlign: 'right', ...tabular }}>
                    {setVolume >= 1000
                      ? `${(setVolume / 1000).toFixed(1)}k`
                      : Math.round(setVolume)}
                  </Text>
                </>
              )}

              <Pressable onPress={() => onEditNote(set.key)} hitSlop={8} style={{ width: 16, alignItems: 'center' }}>
                <Ionicons
                  name={set.note ? 'document-text' : 'document-text-outline'}
                  size={13}
                  color={set.note ? colors.accentText : colors.faint}
                />
              </Pressable>
              <Pressable onPress={() => onRemoveSet(set.key)} hitSlop={10} style={{ width: 15 }}>
                <Ionicons name="close" size={15} color={colors.faint} />
              </Pressable>
            </Pressable>
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
