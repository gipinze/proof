import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Button, Chip, IconButton, TOP_INSET } from '../components/ui';
import { CARD_WIDTH, ShareCard, cardHeight, type CardFormat, type CardModel } from '../components/ShareCard';
import { getSession, getSessionSets, type SessionRow } from '../db/db';
import { duration, durationLong, fullDate, km, num, pace, paceFrom } from '../lib/format';
import { captureCard, saveToGallery, shareImage } from '../lib/share';
import { muscleLoad, normalisedLoad, summarizeSets, type SetEntry } from '../lib/volume';
import type { TrackPoint } from '../lib/geo';
import type { Nav } from '../nav';
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
  const [session, setSession] = useState<SessionRow | null>(null);
  const [sets, setSets] = useState<SetEntry[]>([]);
  const [format, setFormat] = useState<CardFormat>('story');
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const cardRef = useRef<React.ComponentRef<typeof View>>(null);

  const load = useCallback(async () => {
    const row = await getSession(sessionId);
    setSession(row);
    if (row?.kind === 'lift') {
      const stored = await getSessionSets(sessionId);
      setSets(
        stored.map((s) => ({
          exerciseId: s.exercise_id,
          weight: s.weight,
          reps: s.reps,
          isWarmup: s.is_warmup === 1,
        })),
      );
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
      };
    }

    const summary = summarizeSets(sets);
    const carryOnly = summary.volume === 0 && summary.distanceM > 0;
    return {
      kind: 'lift',
      athlete,
      title: session.title,
      dateLine: fullDate(session.started_at),
      stats: [
        { label: 'Time', value: durationLong(session.duration_s ?? 0) },
        { label: 'Sets', value: `${summary.sets}` },
        carryOnly
          ? { label: 'Distance', value: num(Math.round(summary.distanceM)), unit: 'm' }
          : { label: 'Volume', value: num(Math.round(summary.volume)), unit: 'kg' },
      ],
      caption:
        summary.distanceM > 0
          ? `${summary.exercises} exercises · ${num(Math.round(summary.distanceM))} m`
          : `${summary.exercises} exercises · ${summary.reps} reps`,
      load: normalisedLoad(muscleLoad(sets)),
      format,
    };
  }, [session, sets, format, athlete]);

  const capture = async () => {
    if (!cardRef.current) throw new Error('Card is not ready yet');
    const height = format === 'story' ? 1920 : 1350;
    return captureCard(cardRef, 1080, height);
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
          paddingBottom: space(5),
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
