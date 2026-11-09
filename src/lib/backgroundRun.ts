import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

/**
 * Background run recording.
 *
 * Android stops location updates when the app leaves the foreground unless the
 * work is handed to a foreground service. This module owns the headless task
 * that keeps collecting fixes while the screen is off, and forwards them to
 * whatever listener the Run screen has registered.
 *
 * It is strictly opt-in: the Run screen only starts it after the user turns the
 * switch on and grants "all the time" location. If any of that fails the screen
 * keeps using plain foreground watching, so a broken service can never wedge a
 * run.
 */

export const BACKGROUND_TASK = 'proof-run-location';

type FixListener = (location: Location.LocationObject) => void;

let listener: FixListener | null = null;

export function setBackgroundListener(fn: FixListener | null) {
  listener = fn;
}

// Must be defined at module scope, before React renders, or Android cannot
// deliver updates to a dead-ish app (the task runs in a fresh JS context).
if (!TaskManager.isTaskDefined(BACKGROUND_TASK)) {
  TaskManager.defineTask(BACKGROUND_TASK, async ({ data, error }) => {
    if (error) return;
    const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
    if (!locations?.length) return;
    for (const location of locations) listener?.(location);
  });
}

export async function ensureBackgroundPermission(): Promise<boolean> {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    const asked = await Location.requestForegroundPermissionsAsync();
    if (asked.status !== Location.PermissionStatus.GRANTED) return false;
  }

  const background = await Location.getBackgroundPermissionsAsync();
  if (background.status === Location.PermissionStatus.GRANTED) return true;

  const asked = await Location.requestBackgroundPermissionsAsync();
  return asked.status === Location.PermissionStatus.GRANTED;
}

export async function startBackgroundUpdates(): Promise<boolean> {
  const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_TASK).catch(() => false);
  if (started) return true;

  await Location.startLocationUpdatesAsync(BACKGROUND_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 2000,
    distanceInterval: 3,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: false,
    foregroundService: {
      notificationTitle: 'Proof is recording your run',
      notificationBody: 'Tap to go back to the run.',
      notificationColor: '#FF5A1F',
    },
  });
  return true;
}

export async function stopBackgroundUpdates(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_TASK).catch(() => false);
  if (started) await Location.stopLocationUpdatesAsync(BACKGROUND_TASK).catch(() => {});
}
