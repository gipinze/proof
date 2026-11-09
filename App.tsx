import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from './src/screens/HomeScreen';
import { LogScreen } from './src/screens/LogScreen';
import { RunScreen } from './src/screens/RunScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { ShareScreen } from './src/screens/ShareScreen';
import { getDb, getSession, getSessionSets } from './src/db/db';
import { ATHLETE_KEY, getSetting } from './src/db/settings';
import type { ExerciseDef } from './src/data/exercises';
import { emptyDraft, newKey, type LiftDraft, type Nav, type Route } from './src/nav';
import { duration } from './src/lib/format';
import { colors, space, type } from './src/theme';

type TabName = 'home' | 'run' | 'library';

export default function App() {
  const [ready, setReady] = useState(false);
  const [athlete, setAthlete] = useState('Athlete');
  const [draft, setDraft] = useState<LiftDraft>(emptyDraft());
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        await getDb();
        setAthlete(await getSetting(ATHLETE_KEY, 'Athlete'));
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const bump = useCallback(() => setDataVersion((v) => v + 1), []);

  /** Load a saved lift into the logger so a finished session can be corrected. */
  const editSession = useCallback(
    async (id: number) => {
      const session = await getSession(id);
      if (!session || session.kind !== 'lift') return;

      const sets = await getSessionSets(id);
      const exercises: LiftDraft['exercises'] = [];
      for (const set of sets) {
        const last = exercises[exercises.length - 1];
        const draftSet = {
          key: newKey(),
          weight: String(set.weight),
          reps: String(set.reps || 8),
          distance: String(set.distance_m ?? 0),
          time: set.duration_s ? duration(set.duration_s) : '',
        };
        if (last && last.exerciseId === set.exercise_id) last.sets.push(draftSet);
        else exercises.push({ key: newKey(), exerciseId: set.exercise_id, sets: [draftSet] });
      }

      setDraft({
        startedAt: session.started_at,
        title: session.title,
        exercises,
      });
      setStack((s) => [...s, { name: 'log', editId: id }]);
    },
    [],
  );

  const nav: Nav = {
    push: (route) => setStack((s) => [...s, route]),
    back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    reset: (route) =>
      setStack((s) => (route.name === 'home' ? [{ name: 'home' }] : [...s.slice(0, 1), route])),
    editSession: (id) => {
      editSession(id).catch(() => {});
    },
    bump,
    dataVersion,
  };

  const current = stack[stack.length - 1];
  const activeTab: TabName | null =
    current.name === 'home' || current.name === 'run' || current.name === 'library' ? current.name : null;

  const logExercise = (exercise: ExerciseDef) => {
    const isDistance = exercise.measure === 'distance';
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
              weight: String(exercise.loadFactor === 0 ? 0 : 20),
              reps: '8',
              distance: isDistance ? '20' : '0',
              time: '',
            },
          ],
        },
      ],
    }));
    setStack((s) => [...s, { name: 'log' }]);
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ ...type.title, color: colors.text }}>PROOF</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        {current.name === 'home' ? (
          <HomeScreen nav={nav} athlete={athlete} onAthleteChange={setAthlete} />
        ) : null}
        {current.name === 'log' ? (
          <LogScreen nav={nav} draft={draft} setDraft={setDraft} editId={current.editId} />
        ) : null}
        {current.name === 'run' ? <RunScreen nav={nav} /> : null}
        {current.name === 'library' ? <LibraryScreen onLog={logExercise} /> : null}
        {current.name === 'session' ? <SessionScreen nav={nav} sessionId={current.id} /> : null}
        {current.name === 'share' ? (
          <ShareScreen nav={nav} sessionId={current.id} athlete={athlete} />
        ) : null}
      </View>

      {activeTab ? (
        <View
          style={{
            flexDirection: 'row',
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.bg,
            paddingBottom: space(4),
            paddingTop: space(2),
          }}
        >
          <TabButton
            label="Home"
            icon="home"
            active={activeTab === 'home'}
            onPress={() => nav.reset({ name: 'home' })}
          />
          <TabButton
            label="Run"
            icon="walk"
            active={activeTab === 'run'}
            onPress={() => nav.reset({ name: 'run' })}
          />
          <TabButton
            label="Library"
            icon="book"
            active={activeTab === 'library'}
            onPress={() => nav.reset({ name: 'library' })}
          />
        </View>
      ) : null}
    </View>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', paddingVertical: space(2), gap: 3 }}
    >
      <Ionicons name={icon} size={21} color={active ? colors.accent : colors.faint} />
      <Text style={{ fontSize: 10.5, fontWeight: '700', color: active ? colors.accent : colors.faint }}>
        {label}
      </Text>
    </Pressable>
  );
}
