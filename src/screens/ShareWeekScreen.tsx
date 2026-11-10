import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Chip, IconButton, TOP_INSET } from '../components/ui';
import {
  CARD_WIDTH,
  ShareCard,
  cardHeight,
  type CardFormat,
  type CardModel,
  type CardTheme,
} from '../components/ShareCard';
import { weekSummary, type WeekSummary } from '../db/db';
import { fullDate, km, num } from '../lib/format';
import { captureCard, cardFilename, nameCard, saveToGallery, shareImage } from '../lib/share';
import { normalisedLoad } from '../lib/volume';
import type { Nav } from '../nav';
import { colors, radius, space, type } from '../theme';

function startOfWeek(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** Shareable recap of the current week: volume, sessions, distance, muscles. */
export function ShareWeekScreen({ nav, athlete }: { nav: Nav; athlete: string }) {
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [format, setFormat] = useState<CardFormat>('story');
  const [theme, setTheme] = useState<CardTheme>('dark');
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const cardRef = useRef<React.ComponentRef<typeof View>>(null);

  const load = useCallback(async () => {
    setSummary(await weekSummary(startOfWeek()));
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load, nav.dataVersion]);

  const model: CardModel | null = useMemo(() => {
    if (!summary) return null;
    const from = new Date(summary.from);
    return {
      kind: 'week',
      athlete,
      title: `Week of ${from.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
      dateLine: `${summary.sessions} sessions · ${summary.lifts} lift · ${summary.runs} run`,
      stats: [
        { label: 'Volume', value: num(Math.round(summary.volume)), unit: 'kg' },
        { label: 'Sessions', value: `${summary.sessions}` },
        { label: 'Distance', value: km(summary.distanceM), unit: 'km' },
      ],
      caption: summary.loadDistance > 0 ? `${num(Math.round(summary.loadDistance))} kg·m carried` : null,
      load: normalisedLoad(summary.muscle as never),
      format,
      theme,
    };
  }, [summary, athlete, format, theme]);

  const capture = async () => {
    if (!cardRef.current) throw new Error('Card is not ready yet');
    const height = format === 'story' ? 1920 : 1350;
    const snapshot = await captureCard(cardRef, 1080, height);
    const filename = cardFilename('week recap', summary?.from ?? Date.now(), 'lift');
    return nameCard(snapshot, filename).catch(() => snapshot);
  };

  const onSave = async () => {
    setBusy('save');
    try {
      const uri = await capture();
      const ok = await saveToGallery(uri);
      if (ok) Alert.alert('Saved', 'The recap is in your gallery.');
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    setBusy('share');
    try {
      await shareImage(await capture());
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
        <Text style={{ ...type.title, color: colors.text, flex: 1 }}>Week recap</Text>
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
            <View ref={cardRef} collapsable={false}>
              {model ? <ShareCard model={model} /> : null}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2), marginTop: space(4) }}>
          <Ionicons name="information-circle-outline" size={14} color={colors.faint} />
          <Text style={{ ...type.tiny, color: colors.faint, flex: 1 }}>
            MONDAY TO NOW · {CARD_WIDTH} × {height} DP · EXPORTS AT 1080 PX WIDE
          </Text>
        </View>
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
