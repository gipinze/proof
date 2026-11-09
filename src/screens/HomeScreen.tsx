import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, IconButton, Screen, SectionLabel, Stat } from '../components/ui';
import { listSessionSummaries, statsSince, type SessionListItem } from '../db/db';
import { getSetting, setSetting, ATHLETE_KEY } from '../db/settings';
import { duration, km, kgLabel, relativeDay, volumeParts } from '../lib/format';
import type { Nav } from '../nav';
import { colors, radius, space, tabular, type } from '../theme';

export function HomeScreen({
  nav,
  athlete,
  onAthleteChange,
}: {
  nav: Nav;
  athlete: string;
  onAthleteChange: (name: string) => void;
}) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [week, setWeek] = useState({ volume: 0, distanceM: 0, lifts: 0, runs: 0 });
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(athlete);

  const load = useCallback(async () => {
    const [list, stats] = await Promise.all([
      listSessionSummaries(25),
      statsSince(startOfWeek()),
    ]);
    setSessions(list);
    setWeek(stats);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load, nav.dataVersion]);

  const today = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  }, []);

  const saveName = async () => {
    const clean = nameDraft.trim() || 'Athlete';
    await setSetting(ATHLETE_KEY, clean);
    onAthleteChange(clean);
    setEditing(false);
  };

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
          <Text style={{ ...type.section, color: colors.text, letterSpacing: 2 }}>PROOF</Text>
        </View>
        <Text style={{ ...type.caption, color: colors.faint }}>{today}</Text>
      </View>

      <Pressable
        onPress={() => {
          setNameDraft(athlete);
          setEditing(true);
        }}
        style={{ flexDirection: 'row', alignItems: 'center', marginTop: space(6), gap: space(3) }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1.5,
            borderColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: 18 }}>
            {(athlete || 'A').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.title, color: colors.text }}>{athlete || 'Athlete'}</Text>
          <Text style={{ ...type.caption, color: colors.muted }}>Tap to change your name</Text>
        </View>
        <IconButton icon="create-outline" onPress={() => setEditing(true)} size={34} bg={colors.surface} />
      </Pressable>

      <Card style={{ marginTop: space(6), padding: space(5) }}>
        <Text style={{ ...type.tiny, color: colors.faint, textTransform: 'uppercase' }}>This week</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
          <Text style={{ fontSize: 42, fontWeight: '800', color: colors.text, letterSpacing: -1.6, ...tabular }}>
            {volumeParts(week.volume).value}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.muted, marginLeft: 5 }}>
            {volumeParts(week.volume).unit}
          </Text>
        </View>
        <Text style={{ ...type.caption, color: colors.muted, marginTop: 2 }}>total volume lifted</Text>

        <View style={{ flexDirection: 'row', marginTop: space(5), justifyContent: 'space-between' }}>
          <Stat label="Sessions" value={`${week.lifts + week.runs}`} size="md" />
          <Stat label="Distance" value={km(week.distanceM)} unit="km" size="md" />
          <Stat label="Lifts" value={`${week.lifts}`} size="md" />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: space(3), marginTop: space(3) }}>
        <Button
          label="Start a run"
          icon="walk"
          onPress={() => nav.push({ name: 'run' })}
          style={{ flex: 1 }}
        />
        <Button
          label="Log a lift"
          icon="barbell"
          variant="surface"
          onPress={() => nav.push({ name: 'log' })}
          style={{ flex: 1 }}
        />
      </View>

      <SectionLabel
        right={
          <Pressable onPress={() => nav.push({ name: 'library' })} hitSlop={8}>
            <Text style={{ ...type.caption, color: colors.accentText }}>Library</Text>
          </Pressable>
        }
      >
        Recent
      </SectionLabel>

      {sessions.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: space(8) }}>
          <Ionicons name="pulse-outline" size={26} color={colors.faint} />
          <Text style={{ ...type.body, color: colors.text, marginTop: space(2) }}>Nothing logged yet</Text>
          <Text style={{ ...type.caption, color: colors.muted, textAlign: 'center', marginTop: 4 }}>
            Log a lift or record a run and it shows up here — and nowhere else.
          </Text>
          <Button
            label="See a sample card"
            variant="ghost"
            icon="sparkles-outline"
            onPress={async () => {
              const { createSampleSessions } = await import('../dev/sample');
              await createSampleSessions();
              nav.bump();
            }}
            style={{ marginTop: space(4) }}
          />
        </Card>
      ) : (
        <View style={{ gap: space(2) }}>
          {sessions.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => nav.push({ name: 'session', id: s.id })}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                padding: space(3.5),
                gap: space(3),
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: s.kind === 'run' ? '#26160E' : colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={s.kind === 'run' ? 'walk' : 'barbell'}
                  size={17}
                  color={s.kind === 'run' ? colors.accent : colors.muted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...type.body, color: colors.text }} numberOfLines={1}>
                  {s.title}
                </Text>
                <Text style={{ ...type.caption, color: colors.muted, marginTop: 1 }} numberOfLines={1}>
                  {relativeDay(s.started_at)}
                  {s.kind === 'run'
                    ? ` · ${km(s.distance_m ?? 0)} km · ${duration(s.duration_s ?? 0)}`
                    : ` · ${s.workingSets} sets`}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, ...tabular }}>
                  {s.kind === 'run' ? km(s.distance_m ?? 0) : volumeParts(s.volume).value}
                </Text>
                <Text style={{ ...type.tiny, color: colors.faint }}>
                  {s.kind === 'run' ? 'KM' : volumeParts(s.volume).unit.toUpperCase()}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ marginTop: space(8), alignItems: 'center' }}>
        <Text style={{ ...type.tiny, color: colors.faint, textAlign: 'center', lineHeight: 15 }}>
          100% ON THIS PHONE · NO ACCOUNT · NO CLOUD
        </Text>
      </View>

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: space(6) }}
          onPress={() => setEditing(false)}
        >
          <Pressable style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space(5) }}>
            <Text style={{ ...type.title, color: colors.text }}>Your name</Text>
            <Text style={{ ...type.caption, color: colors.muted, marginTop: 4 }}>
              Shown on your share cards.
            </Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              autoFocus
              placeholder="Athlete"
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
              <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} style={{ flex: 1 }} />
              <Button label="Save" onPress={saveName} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function startOfWeek(): number {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
