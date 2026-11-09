import { captureRef } from 'react-native-view-shot';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
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

/**
 * Save the card to the phone's gallery.
 *
 * SDK 58 replaced the old `saveToLibraryAsync` helper with the class API
 * (`Asset.create`), which writes through MediaStore and normally needs no
 * runtime permission on Android 10+. Permission is only requested if that
 * write is refused, so a first save does not open an "allow all photos"
 * dialog for an app that only ever writes one file.
 */
export async function saveToGallery(uri: string): Promise<boolean> {
  try {
    await Asset.create(uri);
    return true;
  } catch {
    try {
      const perm = await requestPermissionsAsync();
      if (perm.granted) {
        await Asset.create(uri);
        return true;
      }
      Alert.alert(
        'Gallery access needed',
        'Proof needs permission to save the card. You can always use Share instead.',
      );
      return false;
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
