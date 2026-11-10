import React from 'react';
import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { BODY_ASPECT, slugIntensity, viewsFor, type BodyModel } from '../data/anatomy';
import type { MuscleId } from '../data/muscles';
import { colors } from '../theme';

const MIRROR = 'translate(200,0) scale(-1,1)';

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function mix(a: string, b: string, t: number) {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const p = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return '#' + p.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Cold-to-hot ramp for a 0..1 intensity. */
export function heatColor(t: number): string {
  const ramp = colors.heat;
  if (!t || t <= 0) return ramp[0];
  // gamma: mid intensities stay dark so a secondary muscle never reads as hot
  // as the movement that actually drove the session
  const shaped = Math.pow(Math.min(1, Math.max(0, t)), 1.35);
  const pos = Math.min(0.999, shaped) * (ramp.length - 1);
  const i = Math.floor(pos);
  return mix(ramp[i], ramp[i + 1], pos - i);
}

type BodyProps = {
  view: 'front' | 'back';
  load?: Partial<Record<MuscleId, number>>;
  width: number;
  height: number;
  /** Which body to draw; both models share the same muscle slugs. */
  model?: BodyModel;
};

export function MuscleBody({ view, load = {}, width, height, model = 'male' }: BodyProps) {
  const { viewBox, parts } = viewsFor(model)[view];

  return (
    <Svg width={width} height={height} viewBox={viewBox}>
      {parts.map((part) => {
        const intensity = slugIntensity(view, part.slug, load);
        const fill = intensity === null ? colors.body : heatColor(intensity);
        return (
          <G key={part.slug}>
            {(part.paths.common ?? []).map((d, i) => (
              <Path key={`c${i}`} d={d} fill={fill} />
            ))}
            {(part.paths.left ?? []).map((d, i) => (
              <Path key={`l${i}`} d={d} fill={fill} />
            ))}
            {(part.paths.right ?? []).map((d, i) => (
              <Path key={`r${i}`} d={d} fill={fill} />
            ))}
          </G>
        );
      })}
    </Svg>
  );
}

type PairProps = {
  load?: Partial<Record<string, number>>;
  height: number;
  gap?: number;
  views?: ('front' | 'back')[];
  maxWidth?: number;
  model?: BodyModel;
};

export function AnatomyPair({ load = {}, height, gap = 6, views = ['front', 'back'], maxWidth, model = 'male' }: PairProps) {
  const count = views.length;
  const maxHeightForWidth = maxWidth ? (maxWidth - gap * (count - 1)) / count / BODY_ASPECT : Infinity;
  const h = Math.min(height, maxHeightForWidth);
  const width = h * BODY_ASPECT;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap, justifyContent: 'center' }}>
      {views.map((v) => (
        <MuscleBody key={v} view={v} load={load} width={width} height={h} model={model} />
      ))}
    </View>
  );
}
