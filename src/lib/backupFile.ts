import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { exportBackup, importBackup } from '../db/db';
import { validateBackup, type Backup } from './backup';

/**
 * Backup to a file.
 *
 * The whole database lives on one phone, so this is the only way out. We hand
 * the file to the system share sheet rather than writing to a fixed folder:
 * the user decides whether it goes to Drive, a laptop, or their own Downloads,
 * and Proof never needs broad storage permission.
 */

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export async function shareBackup(): Promise<boolean> {
  const backup = await exportBackup();
  const dir = FileSystem.cacheDirectory ?? '';
  const path = `${dir}proof-backup-${stamp()}.json`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(backup, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('Sharing unavailable', 'This device cannot open the share sheet.');
    return false;
  }
  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    dialogTitle: 'Save your Proof backup',
    UTI: 'public.json',
  });
  return true;
}

/**
 * Save straight into a folder the user picks (Downloads, Drive, an SD card).
 * Uses the system folder picker, so no storage permission is needed and the
 * backup does not depend on having a sharing app installed.
 */
export async function saveBackupToFolder(): Promise<{ name: string } | null> {
  const backup = await exportBackup();
  const json = JSON.stringify(backup, null, 2);
  const name = `proof-backup-${stamp()}.json`;

  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return null;

  const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    name,
    'application/json',
  );
  await FileSystem.writeAsStringAsync(fileUri, json);
  return { name };
}

export type PickedBackup = { backup: Backup; filename: string };

/** Ask for a file and hand back the parsed, validated contents. */
export async function pickBackup(): Promise<PickedBackup | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.length) return null;

  const asset = picked.assets[0];
  const raw = await FileSystem.readAsStringAsync(asset.uri);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  return {
    backup: validateBackup(parsed),
    filename: asset.name ?? 'backup.json',
  };
}

export async function restoreBackup(backup: Backup) {
  return importBackup(backup);
}
