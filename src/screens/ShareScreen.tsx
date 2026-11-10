import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Button, Chip, IconButton, TOP_INSET } from '../components/ui';
import {
  CARD_WIDTH,
  ShareCard,
  cardHeight,
  type CardFormat,
  type CardModel,
  type CardTheme,
} from '../components/ShareCard';
import { getSession, getSessionSets, personalRecords, type SessionRow } from '../db/db';
import { duration, durationLong, fullDate, km, num, pace, paceFrom } from '../lib/format';
import { captureCard, cardFilename, nameCard, saveToGallery, shareImage } from '../lib/share';
import { muscleLoad, normalisedLoad, summarizeSets, type SetEntry } from '../lib/volume';
import type { TrackPoint } from '../lib/geo';
import type { Nav } from '../nav';
import { useBottomInset } from '../lib/insets';
import { BODY_MODEL_KEY, getSetting } from '../db/settings';
import type { BodyModel } from '../data/anatomy';
import { colors, radius, space, type } from '../theme';

export function ShareScreen({
  nav,
  sessionId,
  athlete,
}: {
  nav: Nav;
  sessionId: number;
  athlete: string;
}) {
  const insets = { bottom: useBottomInset() };
  const [session, setSession] = useState<SessionRow | null>(null);
  const [sets, setSets] = useState<SetEntry[]>([]);
  const [format, setFormat] = useState<CardFormat>('story');
  const [theme, setTheme] = useState<CardTheme>('dark');
  const [bodyModel, setBodyModel] = useState<BodyModel>('male');
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const [prCount, setPrCount] = useState(0);
  const cardRef = useRef<React.ComponentRef<typeof View>>(null);

  const load = useCallback(async () => {
    setBodyModel(((await getSetting(BODY_MODEL_KEY, 'male')) as BodyModel) ?? 'male');
    const row = await getSession(sessionId);
    setSession(row);
    if (row?.kind === 'lift') {
      const stored = await getSessionSets(sessionId);
      setSets(
        stored.map((s) => ({
          exerciseId: s.exercise_id,
          weight: s.weight,
          reps: s.reps,
          distanceM: s.distance_m ?? undefined,
          durationS: s.duration_s ?? undefined,
          isWarmup: s.is_warmup === 1,
        })),
      );
      const prs = await personalRecords(row, stored).catch(() => new Map());
      setPrCount([...prs.values()].filter((p) => p.isPR).length);
    }
  }, [sessionId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const model: CardModel | null = useMemo(() => {
    if (!session) return null;
    const isRun = session.kind === 'run';

    if (isRun) {
      let track: TrackPoint[] = [];
      try {
        track = session.track ? (JSON.parse(session.track) as TrackPoint[]) : [];
      } catch {
        track = [];
      }
      const distanceM = session.distance_m ?? 0;
      const seconds = session.duration_s ?? 0;
      return {
        kind: 'run',
        athlete,
        title: session.title,
        dateLine: fullDate(session.started_at),
        stats: [
          { label: 'Distance', value: km(distanceM), unit: 'km' },
          { label: 'Pace', value: pace(paceFrom(distanceM, seconds)), unit: '/km' },
          { label: 'Time', value: durationLong(seconds) },
        ],
        caption: 'Recorded on this phone · no cloud',
        track,
        format,
        theme,
      };
    }

    const summary = summarizeSets(sets);
    const hasVolume = summary.volume > 0;
    const hasDistance = summary.distanceM > 0;
    // mixed sessions get both numbers; single-modality ones keep the set count
    const stats = [
      { label: 'Time', value: durationLong(session.duration_s ?? 0) },
      ...(hasVolume && hasDistance
        ? [
            { label: 'Volume', value: num(Math.round(summary.volume)), unit: 'kg' },
            { label: 'Distance', value: num(Math.round(summary.distanceM)), unit: 'm' },
          ]
        : [
            { label: 'Sets', value: `${summary.sets}` },
            hasVolume
              ? { label: 'Volume', value: num(Math.round(summary.volume)), unit: 'kg' }
              : { label: 'Distance', value: num(Math.round(summary.distanceM)), unit: 'm' },
          ]),
    ];

    return {
      kind: 'lift',
      athlete,
      title: session.title,
      dateLine: fullDate(session.started_at),
      stats,
      caption: `${summary.exercises} ${summary.exercises === 1 ? 'exercise' : 'exercises'} · ${
        summary.sets
      } ${summary.sets === 1 ? 'set' : 'sets'}${
        !hasVolume && hasDistance && summary.distanceTimeS > 0
          ? ` · ${durationLong(summary.distanceTimeS)}`
          : ''
      }${prCount > 0 ? ` · ${prCount} PR` : ''}`,
      load: normalisedLoad(muscleLoad(sets)),
      format,
      theme,
      bodyModel,
    };
  }, [session, sets, format, theme, bodyModel, athlete]);

  const capture = async () => {
    if (!cardRef.current) throw new Error('Card is not ready yet');
    const height = format === 'story' ? 1920 : 1350;
    const snapshot = await captureCard(cardRef, 1080, height);
    // a readable name in the gallery and in the share sheet
    const filename = cardFilename(session?.title ?? 'proof', session?.started_at ?? Date.now(), 'lift');
    return nameCard(snapshot, filename).catch(() => snapshot);
  };

  const onSave = async () => {
    setBusy('save');
    try {
      const uri = await capture();
      const ok = await saveToGallery(uri);
      if (ok) Alert.alert('Saved', 'The card is in your gallery — post it anywhere.');
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    setBusy('share');
    try {
      const uri = await capture();
      await shareImage(uri);
    } catch (err) {
      Alert.alert('Share failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  };

  const height = cardHeight(format);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: TOP_INSET,
          paddingHorizontal: space(4),
          paddingBottom: space(3),
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(3),
        }}
      >
        <IconButton icon="chevron-back" onPress={nav.back} size={34} bg={colors.surface} />
        <Text style={{ ...type.title, color: colors.text, flex: 1 }}>Share card</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4) }}
      >
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <Chip label="Story 9:16" active={format === 'story'} onPress={() => setFormat('story')} />
          <Chip label="Feed 4:5" active={format === 'feed'} onPress={() => setFormat('feed')} />
          <View style={{ flex: 1 }} />
          <Chip label="Dark" active={theme === 'dark'} onPress={() => setTheme('dark')} />
          <Chip label="Light" active={theme === 'light'} onPress={() => setTheme('light')} />
        </View>

        <View style={{ alignItems: 'center', marginTop: space(4) }}>
          <View
            style={{
              borderRadius: radius.md,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {/* the captured view itself stays unstyled, so the PNG is edge-to-edge */}
            <View ref={cardRef} collapsable={false}>
              {model ? <ShareCard model={model} /> : null}
            </View>
          </View>
        </View>

        <Text style={{ ...type.tiny, color: colors.faint, textAlign: 'center', marginTop: space(3) }}>
          {CARD_WIDTH} × {height} dp · EXPORTS AT 1080 PX WIDE
        </Text>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: space(3),
          paddingHorizontal: space(4),
          paddingTop: space(3),
          paddingBottom: insets.bottom + space(3),
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Button
          label="Save image"
          icon="download-outline"
          variant="surface"
          onPress={onSave}
          loading={busy === 'save'}
          style={{ flex: 1 }}
        />
        <Button
          label="Share"
          icon="share-outline"
          onPress={onShare}
          loading={busy === 'share'}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
