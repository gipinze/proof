import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Button } from './ui';
import { setExerciseNote } from '../db/db';
import { colors, radius, space, type } from '../theme';

/**
 * A standing note for an exercise — the thing you want to read *before* the
 * first set ("3×5 at 110, belt from set 2"). Separate from per-set notes, which
 * describe what happened.
 */
export function ExerciseNoteSheet({
  exerciseId,
  exerciseName,
  visible,
  initial,
  onClose,
  onSaved,
}: {
  exerciseId: string | null;
  exerciseName?: string;
  visible: boolean;
  initial: string;
  onClose: () => void;
  onSaved: (note: string) => void;
}) {
  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible, initial]);

  const save = async (value: string) => {
    if (!exerciseId) return;
    await setExerciseNote(exerciseId, value);
    onSaved(value.trim());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: space(6) }}
        onPress={onClose}
      >
        <Pressable style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(5) }}>
          <Text style={{ ...type.title, color: colors.text }}>Pre-note</Text>
          <Text style={{ ...type.caption, color: colors.muted, marginTop: 4 }}>
            {exerciseName ? `${exerciseName} · ` : ''}a target or a cue you want to see before you lift.
          </Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            autoFocus
            multiline
            placeholder="3×5 at 110, belt from set 2"
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
            <Button label="Clear" variant="ghost" onPress={() => save('')} style={{ flex: 1 }} />
            <Button label="Save" onPress={() => save(draft)} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
