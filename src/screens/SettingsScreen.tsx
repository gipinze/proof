import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, IconButton, Screen, SectionLabel, TOP_INSET } from '../components/ui';
import { exportBackup, listSessionSummaries } from '../db/db';
import { getSetting, LAST_ERROR_KEY, setSetting } from '../db/settings';
import {
  hasPreRestoreSnapshot,
  pickBackup,
  restoreBackup,
  saveBackupToFolder,
  shareBackup,
  undoLastRestore,
} from '../lib/backupFile';
import type { Nav } from '../nav';
import { colors, radius, space, type } from '../theme';

/** Data safety: the only way the database leaves the phone. */
export function SettingsScreen({ nav }: { nav: Nav }) {
  const [counts, setCounts] = useState({ sessions: 0, volume: 0 });
  const [busy, setBusy] = useState<'export' | 'folder' | 'restore' | 'undo' | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [lastError, setLastError] = useState('');

  const load = useCallback(async () => {
    const sessions = await listSessionSummaries(500);
    setCounts({
      sessions: sessions.length,
      volume: sessions.reduce((sum, s) => sum + s.volume, 0),
    });
    setCanUndo(await hasPreRestoreSnapshot());
    setLastError((await getSetting(LAST_ERROR_KEY)) ?? '');
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load, nav.dataVersion]);

  const onExport = async () => {
    setBusy('export');
    try {
      const backup = await exportBackup();
      const ok = await shareBackup();
      if (ok) {
        Alert.alert(
          'Backup ready',
          `${backup.sessions.length} sessions and ${backup.sets.length} sets. Save it somewhere that is not this phone.`,
        );
      }
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  };

  const onSaveToFolder = async () => {
    setBusy('folder');
    try {
      const saved = await saveBackupToFolder();
      if (saved) Alert.alert('Backup saved', `${saved.name} is in the folder you picked.`);
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  };

  const onUndo = async () => {
    Alert.alert(
      'Undo the last restore?',
      'This puts back the data that was on the phone before your last restore.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo',
          style: 'destructive',
          onPress: async () => {
            setBusy('undo');
            try {
              const sessions = await undoLastRestore();
              nav.bump();
              Alert.alert('Undone', `${sessions} sessions from before the restore are back.`);
            } catch (err) {
              Alert.alert('Nothing to undo', err instanceof Error ? err.message : 'Unknown error');
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const onRestore = async () => {
    try {
      const picked = await pickBackup();
      if (!picked) return;
      const { sessions, sets } = {
        sessions: picked.backup.sessions.length,
        sets: picked.backup.sets.length,
      };

      Alert.alert(
        'Replace everything?',
        `${picked.filename} holds ${sessions} sessions and ${sets} sets.\n\nRestoring replaces what is on this phone. That cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: async () => {
              setBusy('restore');
              try {
                await restoreBackup(picked.backup);
                nav.bump();
                Alert.alert('Restored', `${sessions} sessions are back.`);
              } catch (err) {
                Alert.alert('Restore failed', err instanceof Error ? err.message : 'Unknown error');
              } finally {
                setBusy(null);
              }
            },
          },
        ],
      );
    } catch (err) {
      Alert.alert('Could not read that backup', err instanceof Error ? err.message : 'Unknown error');
    }
  };

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
        <Text style={{ ...type.title, color: colors.text, flex: 1 }}>Settings</Text>
      </View>

      <Screen scroll contentStyle={{ paddingBottom: space(24) }}>
        <SectionLabel>Your data</SectionLabel>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space(2) }}>
            <Text style={{ ...type.display, color: colors.text }}>{counts.sessions}</Text>
            <Text style={{ ...type.caption, color: colors.muted }}>sessions on this phone</Text>
          </View>
          <Text style={{ ...type.caption, color: colors.muted, marginTop: space(2) }}>
            Everything lives in one database in this app. No account, no cloud, no copy
            anywhere else — so a lost phone means a lost log unless you export.
          </Text>

          <Button
            label="Export a backup"
            icon="download-outline"
            onPress={onExport}
            loading={busy === 'export'}
            style={{ marginTop: space(4) }}
          />
          <Button
            label="Save to a folder"
            icon="folder-outline"
            variant="surface"
            onPress={onSaveToFolder}
            loading={busy === 'folder'}
            style={{ marginTop: space(2) }}
          />
          {canUndo ? (
            <Button
              label="Undo last restore"
              icon="arrow-undo-outline"
              variant="ghost"
              onPress={onUndo}
              loading={busy === 'undo'}
              style={{ marginTop: space(2) }}
            />
          ) : null}
          <Button
            label="Restore from a file"
            icon="push-outline"
            variant="surface"
            onPress={onRestore}
            loading={busy === 'restore'}
            style={{ marginTop: space(2) }}
          />
        </Card>

        {lastError ? (
          <Card style={{ marginTop: space(4) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
              <Ionicons name="bug-outline" size={15} color={colors.accentText} />
              <Text style={{ ...type.caption, color: colors.text, flex: 1 }}>Last crash</Text>
              <Pressable
                onPress={async () => {
                  await setSetting(LAST_ERROR_KEY, '');
                  setLastError('');
                }}
                hitSlop={8}
              >
                <Text style={{ ...type.tiny, color: colors.accentText }}>CLEAR</Text>
              </Pressable>
            </View>
            <Text style={{ ...type.tiny, color: colors.muted, marginTop: 4 }} selectable>
              {lastError}
            </Text>
          </Card>
        ) : null}

        <SectionLabel>How it works</SectionLabel>
        <Card>
          {[
            ['shield-checkmark-outline', 'On device only', 'Sessions never leave the phone unless you export them.'],
            ['finger-print-outline', 'No account', 'No sign-in, no sync, nothing to leak.'],
            ['document-text-outline', 'One file', 'The backup is plain JSON — readable, and yours forever.'],
          ].map(([icon, title, body]) => (
            <View key={title} style={{ flexDirection: 'row', gap: space(3), marginTop: space(2) }}>
              <Ionicons name={icon as never} size={17} color={colors.accentText} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...type.caption, color: colors.text, fontWeight: '700' }}>{title}</Text>
                <Text style={{ ...type.tiny, color: colors.muted, marginTop: 1 }}>{body}</Text>
              </View>
            </View>
          ))}
        </Card>

        <Pressable onPress={nav.back} style={{ marginTop: space(4), alignSelf: 'center' }}>
          <Text style={{ ...type.caption, color: colors.faint }}>Back</Text>
        </Pressable>
      </Screen>
    </View>
  );
}
