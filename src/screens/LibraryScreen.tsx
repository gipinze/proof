import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnatomyPair } from '../components/AnatomyMap';
import { Button, Chip, IconButton, Screen, SectionLabel } from '../components/ui';
import {
  CATEGORIES,
  searchExercises,
  musclesOfExercise,
  type Category,
  type ExerciseDef,
} from '../data/exercises';
import { MUSCLE_NAME } from '../data/muscles';
import { colors, radius, space, type } from '../theme';

export function LibraryScreen({
  onLog,
}: {
  onLog: (exercise: ExerciseDef) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [selected, setSelected] = useState<ExerciseDef | null>(null);

  const results = useMemo(() => searchExercises(query, category), [query, category]);

  const load = useMemo(() => {
    if (!selected) return {};
    const out: Record<string, number> = {};
    for (const m of musclesOfExercise(selected)) out[m.id] = m.weight === 3 ? 1 : m.weight === 2 ? 0.55 : 0.28;
    return out;
  }, [selected]);

  return (
    <Screen contentStyle={{ paddingBottom: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ ...type.display, color: colors.text }}>Library</Text>
          <Text style={{ ...type.caption, color: colors.muted, marginTop: 2 }}>
            Every exercise and the muscles it hits
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          paddingHorizontal: space(3.5),
          borderWidth: 1,
          borderColor: colors.border,
          marginTop: space(4),
        }}
      >
        <Ionicons name="search" size={16} color={colors.faint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises"
          placeholderTextColor={colors.faint}
          style={{ flex: 1, color: colors.text, paddingVertical: 12, paddingLeft: 8, fontSize: 15 }}
          autoCorrect={false}
        />
      </View>

      <View style={{ marginTop: space(3), marginHorizontal: -space(4) }}>
        <FlatList
          horizontal
          data={['All', ...CATEGORIES] as (Category | 'All')[]}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space(2), paddingHorizontal: space(4) }}
          renderItem={({ item }) => (
            <Chip label={item} active={category === item} onPress={() => setCategory(item)} />
          )}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        style={{ marginTop: space(3) }}
        contentContainerStyle={{ paddingBottom: space(20) }}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
        renderItem={({ item }) => {
          const muscles = musclesOfExercise(item);
          return (
            <Pressable
              onPress={() => setSelected(item)}
              style={({ pressed }) => ({
                paddingVertical: space(3.5),
                flexDirection: 'row',
                alignItems: 'center',
                gap: space(3),
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ ...type.body, color: colors.text }}>{item.name}</Text>
                <Text style={{ fontSize: 10.5, color: colors.faint, marginTop: 2 }}>
                  {muscles
                    .slice(0, 4)
                    .map((m) => MUSCLE_NAME[m.id])
                    .join(' · ')}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 3,
                }}
              >
                {[3, 2, 1].map((role) => (
                  <View
                    key={role}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor:
                        muscles[0]?.weight === role
                          ? colors.accent
                          : muscles.some((m) => m.weight === role)
                            ? colors.accentText
                            : colors.surfaceHi,
                    }}
                  />
                ))}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
            </Pressable>
          );
        }}
      />

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: space(10) }}>
          <View style={{ paddingHorizontal: space(4) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
              <IconButton icon="close" onPress={() => setSelected(null)} size={34} bg={colors.surface} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...type.title, color: colors.text }}>{selected?.name}</Text>
                <Text style={{ ...type.caption, color: colors.muted, marginTop: 2 }}>
                  {selected?.category} · {selected?.equipment}
                  {selected?.loadFactor === 2 ? ' · per dumbbell' : ''}
                  {selected?.isUnilateral ? ' · per side' : ''}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: 'center', marginTop: space(6) }}>
              <AnatomyPair load={load} height={330} gap={10} maxWidth={360} />
            </View>

            <SectionLabel>Muscles worked</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
              {(selected ? musclesOfExercise(selected) : []).map((m) => (
                <View
                  key={m.id}
                  style={{
                    backgroundColor: m.weight === 3 ? colors.accentDim : colors.surfaceAlt,
                    borderRadius: radius.pill,
                    paddingHorizontal: space(3),
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      ...type.caption,
                      color: m.weight === 3 ? colors.accentText : colors.muted,
                    }}
                  >
                    {MUSCLE_NAME[m.id]}
                    {m.weight === 3 ? ' · primary' : m.weight === 2 ? ' · secondary' : ''}
                  </Text>
                </View>
              ))}
            </View>

            <Button
              label="Log this exercise"
              icon="add"
              onPress={() => {
                if (selected) onLog(selected);
                setSelected(null);
              }}
              style={{ marginTop: space(8) }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
