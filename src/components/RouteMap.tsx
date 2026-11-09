import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { projectTrack, toPolyline, type TrackPoint } from '../lib/geo';
import { colors, radius, space, type } from '../theme';

type Props = {
  track: TrackPoint[];
  width: number;
  height: number;
  color?: string;
  background?: string;
  padding?: number;
  grid?: boolean;
  markers?: boolean;
  label?: string;
};

/**
 * Route art: the recorded polyline scaled to fit. Deliberately tile-free so a
 * card always renders the same offline, on any phone.
 */
export function RouteMap({
  track,
  width,
  height,
  color = colors.accent,
  background = '#15151C',
  padding = 18,
  grid = true,
  markers = true,
  label,
}: Props) {
  const points = projectTrack(track, width, height, padding);
  const d = toPolyline(points);
  const start = points[0];
  const end = points[points.length - 1];

  return (
    <View style={{ width, height, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: background }}>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill={background} />
        {grid
          ? Array.from({ length: 9 }).map((_, i) => (
              <Path
                key={`h${i}`}
                d={`M 0 ${(height / 9) * i} L ${width} ${(height / 9) * i}`}
                stroke="#FFFFFF"
                strokeOpacity={0.03}
                strokeWidth={1}
              />
            ))
          : null}
        {grid
          ? Array.from({ length: 7 }).map((_, i) => (
              <Path
                key={`v${i}`}
                d={`M ${(width / 7) * i} 0 L ${(width / 7) * i} ${height}`}
                stroke="#FFFFFF"
                strokeOpacity={0.03}
                strokeWidth={1}
              />
            ))
          : null}

        {points.length > 1 ? (
          <>
            <Path d={d} stroke={color} strokeOpacity={0.18} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={d} stroke={color} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : null}

        {markers && start ? (
          <>
            <Circle cx={start.x} cy={start.y} r={5.5} fill="#FFFFFF" />
            <Circle cx={start.x} cy={start.y} r={2.4} fill={color} />
          </>
        ) : null}
        {markers && end ? <Circle cx={end.x} cy={end.y} r={4} fill={color} stroke="#FFFFFF" strokeWidth={2} /> : null}
      </Svg>

      {label ? (
        <Text
          style={{
            position: 'absolute',
            left: 12,
            bottom: 10,
            ...type.tiny,
            color: '#FFFFFF99',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function RouteThumb({ track, size = 64 }: { track: TrackPoint[]; size?: number }) {
  return (
    <RouteMap
      track={track}
      width={size}
      height={size}
      padding={7}
      grid={false}
      markers={false}
      background="#14141A"
    />
  );
}

export function noTrackStyle() {
  return { padding: space(2) };
}
