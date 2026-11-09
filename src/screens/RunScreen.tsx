import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Switch, Text, useWindowDimensions, View } from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import { Button, Screen, Stat } from '../components/ui';
import { RouteMap } from '../components/RouteMap';
import { saveRun } from '../db/db';
import { duration, km, pace, paceFrom, timeOfDay } from '../lib/format';
import { haversine, simplifyTrack, trackDistance, type TrackPoint } from '../lib/geo';
import {
  ensureBackgroundPermission,
  setBackgroundListener,
  startBackgroundUpdates,
  stopBackgroundUpdates,
} from '../lib/backgroundRun';
import type { Nav } from '../nav';
import { colors, radius, space, tabular, type } from '../theme';

type Phase = 'idle' | 'running' | 'paused';

export function RunScreen({ nav }: { nav: Nav }) {
  useKeepAwake();

  const { width: winW } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>('idle');
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [saving, setSaving] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'waiting' | 'ok'>('waiting');
  /** Opt-in: keep recording with a foreground service when the screen locks. */
  const [useBackground, setUseBackground] = useState(false);

  const startedAtRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const pausedTotalRef = useRef(0);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const pointsRef = useRef<TrackPoint[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermission(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'unknown');
    })();
  }, []);

  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => {
      const now = Date.now();
      setElapsed(Math.round((now - startedAtRef.current - pausedTotalRef.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [phase]);

  const stopWatch = useCallback(async () => {
    await stopBackgroundUpdates();
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
  }, []);

  const onPosition = useCallback((loc: Location.LocationObject) => {
    const { latitude, longitude, accuracy } = loc.coords;
    if (accuracy != null && accuracy > 45) return;

    const prev = pointsRef.current[pointsRef.current.length - 1];
    const point: TrackPoint = { lat: latitude, lng: longitude, t: loc.timestamp };

    if (prev) {
      const d = haversine(prev, point);
      const dt = Math.max(0.001, (point.t - prev.t) / 1000);
      // drop teleports (GPS jumps) instead of drawing a 2 km straight line
      if (d / dt > 12) return;
      if (d < 1.2) return;
    }

    pointsRef.current = [...pointsRef.current, point];
    setPoints(pointsRef.current);
    setGpsStatus('ok');
  }, []);

  // fixes collected by the background service land in the same handler
  useEffect(() => {
    setBackgroundListener(onPosition);
    return () => setBackgroundListener(null);
  }, [onPosition]);

  /**
   * Foreground watching is the default. With the switch on, updates come from
   * a foreground service so locking the screen does not pause the route; if
   * the background permission is refused we quietly fall back.
   */
  const beginTracking = async () => {
    if (useBackground) {
      // Android cannot show a simple dialog for background location — it sends
      // the user to a settings page. Say so before yanking them out of the app.
      const existing = await Location.getBackgroundPermissionsAsync().catch(() => null);
      let allowed = existing?.status === 'granted';
      if (!allowed) {
        const openSettings = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Allow background location?',
            'Android will open settings. Choose \u201cAllow all the time\u201d so the route keeps recording with the screen off. Without it Proof only records while it is open.',
            [
              { text: 'Foreground only', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Open settings', onPress: () => resolve(true) },
            ],
          );
        });
        if (openSettings) allowed = await ensureBackgroundPermission().catch(() => false);
      }
      if (allowed) {
        try {
          await startBackgroundUpdates();
          return;
        } catch (err) {
          Alert.alert(
            'Background recording unavailable',
            err instanceof Error ? err.message : 'Falling back to foreground tracking.',
          );
        }
      } else {
        Alert.alert(
          'Background location not allowed',
          'Proof will keep recording while the app stays open. You can grant “Allow all the time” in Android settings.',
        );
      }
    }

    try {
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1200,
          distanceInterval: 2,
        },
        onPosition,
      );
    } catch (err) {
      setPhase('paused');
      Alert.alert(
        'GPS could not start',
        err instanceof Error ? err.message : 'The location service refused to start.',
      );
    }
  };

  const start = async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      setPermission('denied');
      Alert.alert(
        'Location needed',
        'Proof needs your location to draw the route. Nothing leaves this phone.',
      );
      return;
    }
    setPermission('granted');
    pointsRef.current = [];
    setPoints([]);
    setElapsed(0);
    startedAtRef.current = Date.now();
    pausedTotalRef.current = 0;
    pausedAtRef.current = null;
    setPhase('running');
    setGpsStatus('waiting');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const seed = await Location.getLastKnownPositionAsync().catch(() => null);
    if (seed) onPosition(seed);

    await beginTracking();
  };

  const pause = async () => {
    pausedAtRef.current = Date.now();
    setPhase('paused');
    await stopWatch();
  };

  const resume = async () => {
    if (pausedAtRef.current) {
      pausedTotalRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setPhase('running');
    await beginTracking();
  };

  const finish = async () => {
    await stopWatch();
    const track = simplifyTrack(pointsRef.current, 3);
    const distanceM = trackDistance(pointsRef.current);
    const endAt = Date.now();

    if (distanceM < 30) {
      Alert.alert('Too short to save', 'Move at least a few dozen metres before finishing.', [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setPhase('idle');
            setPoints([]);
            pointsRef.current = [];
            setElapsed(0);
          },
        },
      ]);
      return;
    }

    setSaving(true);
    try {
      const id = await saveRun({
        title: `${timeOfDay(new Date(startedAtRef.current))} Run`,
        startedAt: startedAtRef.current,
        endedAt: endAt,
        distanceM,
        track,
      });
      nav.bump();
      setPhase('idle');
      setPoints([]);
      pointsRef.current = [];
      nav.reset({ name: 'session', id });
    } catch (err) {
      Alert.alert('Could not save the run', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => () => void stopWatch(), [stopWatch]);

  const distanceM = trackDistance(points);
  const paceSec = paceFrom(distanceM, elapsed);

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ ...type.tiny, color: colors.faint, letterSpacing: 2 }}>RUN</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: gpsStatus === 'ok' ? colors.good : colors.faint,
            }}
          />
          <Text style={{ ...type.tiny, color: colors.muted }}>
            {gpsStatus === 'ok' ? 'GPS LOCK' : 'GPS WAITING'}
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', marginTop: space(8) }}>
        <Text style={{ fontSize: 82, fontWeight: '800', color: colors.text, letterSpacing: -4, ...tabular }}>
          {km(distanceM)}
        </Text>
        <Text style={{ ...type.tiny, color: colors.faint, marginTop: -6, letterSpacing: 3 }}>KILOMETRES</Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: space(6),
          paddingVertical: space(4),
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Stat label="Time" value={duration(elapsed)} align="center" />
        <Stat label="Pace" value={pace(paceSec)} unit="/km" align="center" />
      </View>

      <View style={{ marginTop: space(5) }}>
        <RouteMap
          track={points}
          width={winW - 32}
          height={220}
        />
      </View>

      <View style={{ marginTop: space(6), alignItems: 'center', gap: space(3) }}>
        {phase === 'idle' ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space(3),
                width: '100%',
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: space(3.5),
                paddingVertical: space(3),
              }}
            >
              <Ionicons name="moon-outline" size={18} color={colors.muted} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...type.body, color: colors.text }}>Record with the screen off</Text>
                <Text style={{ fontSize: 10.5, color: colors.faint, marginTop: 2 }}>
                  Foreground service. Android asks for “all the time” location.
                </Text>
              </View>
              <Switch
                value={useBackground}
                onValueChange={setUseBackground}
                trackColor={{ true: colors.accent, false: colors.surfaceHi }}
                thumbColor="#FFFFFF"
              />
            </View>

            <Pressable
              onPress={start}
              style={({ pressed }) => ({
                width: 190,
                height: 190,
                borderRadius: 95,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
                shadowColor: colors.accent,
                shadowOpacity: 0.4,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 8 },
                elevation: 8,
              })}
            >
              <Ionicons name="play" size={44} color="#FFF" style={{ marginLeft: 6 }} />
              <Text style={{ color: '#FFF', fontWeight: '900', letterSpacing: 3, marginTop: 6 }}>
                START
              </Text>
            </Pressable>
            <Text style={{ ...type.caption, color: colors.muted, textAlign: 'center', maxWidth: 280 }}>
              {permission === 'denied'
                ? 'Location permission is off — enable it in Android settings to record a route.'
                : useBackground
                  ? 'Lock the screen and go — the foreground service keeps the route recording.'
                  : 'Keep the app open while you run. The route stays on this phone.'}
            </Text>
          </>
        ) : (
          <View style={{ flexDirection: 'row', gap: space(3), width: '100%' }}>
            <Button
              label={phase === 'running' ? 'Pause' : 'Resume'}
              icon={phase === 'running' ? 'pause' : 'play'}
              variant="surface"
              onPress={phase === 'running' ? pause : resume}
              style={{ flex: 1 }}
            />
            <Button
              label="Finish"
              icon="flag"
              onPress={finish}
              loading={saving}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </View>

      {phase !== 'idle' ? (
        <Text style={{ ...type.tiny, color: colors.faint, textAlign: 'center', marginTop: space(4) }}>
          RECORDING · {points.length} POINTS
        </Text>
      ) : null}
    </Screen>
  );
}
