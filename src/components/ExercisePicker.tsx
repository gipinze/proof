import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, EXERCISES, searchExercises, type Category, type ExerciseDef } from '../data/exercises';
import { MUSCLE_NAME } from '../data/muscles';
import { Chip, TOP_INSET } from './ui';
import { colors, radius, space, type } from '../theme';
import type { MuscleId } from '../data/anatomy';

export function ExercisePicker({
  visible,
  onClose,
  onPick,
  title = 'Add exercise',
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (exercise: ExerciseDef) => void;
  title?: string;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'All'>('All');

  const results = useMemo(() => searchExercises(query, category), [query, category]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: TOP_INSET }}>
        <View
          style={{
            paddingHorizontal: space(4),
            flexDirection: 'row',
            alignItems: 'center',
            gap: space(3),
            marginBottom: space(3),
          }}
        >
          <Text style={{ ...type.title, color: colors.text, flex: 1 }}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.muted} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: space(4) }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              paddingHorizontal: space(3.5),
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="search" size={16} color={colors.faint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search 100+ exercises"
              placeholderTextColor={colors.faint}
              style={{ flex: 1, color: colors.text, paddingVertical: 12, paddingLeft: 8, fontSize: 15 }}
              autoCorrect={false}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.faint} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space(2), paddingVertical: space(3) }}
          >
            <Chip label="All" active={category === 'All'} onPress={() => setCategory('All')} />
            {CATEGORIES.map((c) => (
              <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(10) }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
          renderItem={({ item }) => <Row exercise={item} onPress={() => onPick(item)} />}
          ListEmptyComponent={
            <Text style={{ color: colors.muted, textAlign: 'center', marginTop: space(10) }}>
              No exercise matches “{query}”.
            </Text>
          }
        />
      </View>
    </Modal>
  );
}

function Row({ exercise, onPress }: { exercise: ExerciseDef; onPress: () => void }) {
  const topMuscles = (Object.entries(exercise.muscles) as [MuscleId, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => MUSCLE_NAME[id])
    .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: space(3.5),
        flexDirection: 'row',
        alignItems: 'center',
        gap: space(3),
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...type.body, color: colors.text }}>{exercise.name}</Text>
        <Text style={{ ...type.caption, color: colors.muted, marginTop: 1 }}>
          {exercise.category} · {exercise.equipment}
          {exercise.isUnilateral ? ' · per side' : ''}
        </Text>
        <Text style={{ fontSize: 10.5, color: colors.faint, marginTop: 2 }} numberOfLines={1}>
          {topMuscles}
        </Text>
      </View>
      <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
    </Pressable>
  );
}

export const ALL_EXERCISES = EXERCISES;
