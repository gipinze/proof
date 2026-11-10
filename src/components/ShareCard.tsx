import React from 'react';
import { Text, View } from 'react-native';
import { AnatomyPair } from './AnatomyMap';
import { RouteMap } from './RouteMap';
import type { TrackPoint } from '../lib/geo';
import { tabular } from '../theme';

export type CardFormat = 'story' | 'feed';
export type CardTheme = 'dark' | 'light';

const PALETTES: Record<CardTheme, {
  bg: string;
  panel: string;
  routeBg: string;
  text: string;
  muted: string;
  chip: string;
  accent: string;
}> = {
  dark: {
    bg: '#0C0C10',
    panel: '#131319',
    routeBg: '#14141B',
    text: '#FFFFFF',
    muted: '#8E8E9A',
    chip: '#1D1D25',
    accent: '#FF5A1F',
  },
  light: {
    bg: '#FFFFFF',
    panel: '#F1F1F5',
    routeBg: '#EDEDF2',
    text: '#0B0B0F',
    muted: '#6C6C78',
    chip: '#ECECF1',
    accent: '#FF5A1F',
  },
};

export type CardModel = {
  kind: 'lift' | 'run' | 'week';
  athlete: string;
  title: string;
  dateLine: string;
  locationLine?: string | null;
  stats: { label: string; value: string; unit?: string }[];
  caption?: string | null;
  load?: Partial<Record<string, number>>;
  track?: TrackPoint[];
  format: CardFormat;
  theme?: CardTheme;
  /** Which body the anatomy drawing uses. */
  bodyModel?: 'male' | 'female';
};

export const CARD_WIDTH = 360;
export function cardHeight(format: CardFormat): number {
  return format === 'story' ? 640 : 450;
}

const BG = '#0C0C10';
const TEXT = '#FFFFFF';
const MUTED = '#8E8E9A';
const ACCENT = '#FF5A1F';

/**
 * The shareable card. Laid out at "design" size (360 wide); a 3x phone
 * rasterises it at 1080 px wide, which is exactly what Instagram wants.
 */
export function ShareCard({ model }: { model: CardModel }) {
  const pal = PALETTES[model.theme ?? 'dark'];
  const height = cardHeight(model.format);
  const statsBlock = 62;
  const visualHeight = height - 20 - 40 - 26 - statsBlock - 26 - 22 - 16;

  return (
    <View
      style={{
        width: CARD_WIDTH,
        height,
        backgroundColor: pal.bg,
        padding: 20,
        borderRadius: 0,
      }}
    >
      {/* athlete row */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: pal.chip,
            borderWidth: 1.5,
            borderColor: pal.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: pal.text, fontWeight: '900', fontSize: 14 }}>
            {(model.athlete || 'A').trim().charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: pal.text, fontSize: 13.5, fontWeight: '800' }} numberOfLines={1}>
            {model.athlete || 'Athlete'}
          </Text>
          <Text style={{ color: pal.muted, fontSize: 10.5, fontWeight: '600', marginTop: 1 }} numberOfLines={1}>
            {model.dateLine}
            {model.locationLine ? ` · ${model.locationLine}` : ''}
          </Text>
        </View>
        <Text style={{ color: pal.muted, fontSize: 16, letterSpacing: 1, marginTop: -6 }}>···</Text>
      </View>

      {/* title */}
      <Text
        style={{
          color: pal.text,
          fontSize: 23,
          fontWeight: '800',
          letterSpacing: -0.6,
          marginTop: 16,
        }}
        numberOfLines={1}
      >
        {model.title}
      </Text>

      {/* stats */}
      <View style={{ flexDirection: 'row', marginTop: 12, height: statsBlock }}>
        {model.stats.map((s, i) => (
          <View key={`${s.label}-${i}`} style={{ marginRight: i === model.stats.length - 1 ? 0 : 18 }}>
            <Text style={{ color: pal.muted, fontSize: 9.5, fontWeight: '700', letterSpacing: 0.4 }}>
              {s.label}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
              <Text
                style={{
                  color: pal.text,
                  fontSize: 19,
                  fontWeight: '800',
                  letterSpacing: -0.5,
                  ...tabular,
                }}
              >
                {s.value}
              </Text>
              {s.unit ? (
                <Text style={{ color: pal.muted, fontSize: 10, fontWeight: '700', marginLeft: 3 }}>{s.unit}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      {/* visual */}
      <View style={{ flex: 1, marginTop: 14, justifyContent: 'center' }}>
        {model.kind === 'run' && model.track && model.track.length > 1 ? (
          <RouteMap
            track={model.track}
            width={CARD_WIDTH - 40}
            height={visualHeight - 12}
            padding={26}
            background={pal.routeBg}
          />
        ) : null}

        {(model.kind === 'lift' || model.kind === 'week') ? (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pal.panel,
              borderRadius: 10,
              paddingVertical: 8,
              height: Math.min(visualHeight - 6, 360),
            }}
          >
            <AnatomyPair
              load={model.load}
              height={Math.min(visualHeight - 22, 348)}
              gap={2}
              maxWidth={CARD_WIDTH - 48}
              model={model.bodyModel ?? 'male'}
            />
          </View>
        ) : null}
      </View>

      {/* footer */}
      <View
        style={{
          marginTop: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 22,
        }}
      >
        <Text style={{ color: pal.muted, fontSize: 10.5, fontWeight: '600' }} numberOfLines={1}>
          {model.caption ?? ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: pal.accent }} />
          <Text style={{ color: pal.text, fontSize: 10.5, fontWeight: '900', letterSpacing: 1.6 }}>PROOF</Text>
        </View>
      </View>
    </View>
  );
}
