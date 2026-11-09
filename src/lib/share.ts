import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';
import { Album, Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

type Ref = React.RefObject<unknown>;

/** Rasterise a rendered card at an exact pixel size. */
export async function captureCard(ref: Ref, width: number, height: number): Promise<string> {
  return captureRef(ref as never, {
    format: 'png',
    quality: 1,
    width,
    height,
    result: 'tmpfile',
  });
}

/** `proof-2026-11-09-carry-day.png` — what shows up in the gallery and share sheet. */
export function cardFilename(title: string, startedAt: number, kind: 'lift' | 'run'): string {
  const date = new Date(startedAt);
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');

  return `proof-${ymd}-${slug || kind}.png`;
}

const ALBUM = 'Proof';

/** Copy the snapshot to a properly named file so the gallery is readable. */
export async function nameCard(snapshotUri: string, filename: string): Promise<string> {
  const dir = FileSystem.cacheDirectory ?? '';
  const target = `${dir}${filename}`;
  await FileSystem.copyAsync({ from: snapshotUri, to: target });
  return target;
}

/**
 * Save to the gallery under a sensible name, inside a "Proof" album. Falls back
 * to the camera roll if album creation is unavailable, and asks for permission
 * only if the unpermissioned write is refused (Android 10+ needs none).
 */
export async function saveToGallery(uri: string): Promise<boolean> {
  const save = async () => {
    const asset = await Asset.create(uri);
    try {
      const album = (await Album.get(ALBUM)) ?? (await Album.create(ALBUM, [asset], true));
      if (await Album.get(ALBUM)) {
        // asset already filed when the album was created; nothing else to do
        void album;
      }
    } catch {
      // album is a nicety — the file is already in the camera roll
    }
  };

  try {
    await save();
    return true;
  } catch {
    try {
      const perm = await requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Gallery access needed',
          'Proof needs permission to save the card. You can always use Share instead.',
        );
        return false;
      }
      await save();
      return true;
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }
}

export async function shareImage(uri: string): Promise<void> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Sharing unavailable', 'This device cannot open the share sheet.');
      return;
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Share your card',
      UTI: 'public.png',
    });
  } catch (err) {
    Alert.alert('Could not share', err instanceof Error ? err.message : 'Unknown error');
  }
}
