import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui';
import { colors, radius, space, type } from '../theme';
import { LAST_ERROR_KEY } from '../db/settings';
import { setSetting } from '../db/settings';

/**
 * Render errors used to leave the app on a dead screen with no way out — on a
 * phone that is indistinguishable from a freeze. This catches them and offers
 * the only thing that reliably helps: go back to somewhere safe, with the
 * message visible so it can be reported instead of guessed at.
 */
type Props = { children: React.ReactNode; onReset: () => void };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // logcat in release builds, plus a copy you can read in Settings
    console.error('Proof screen crashed:', error);
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setSetting(LAST_ERROR_KEY, `${stamp} — ${error.message}`).catch(() => {});
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          padding: space(6),
        }}
      >
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 27,
            backgroundColor: colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: space(4),
          }}
        >
          <Ionicons name="warning-outline" size={26} color={colors.accentText} />
        </View>
        <Text style={{ ...type.title, color: colors.text, textAlign: 'center' }}>
          That screen broke
        </Text>
        <Text
          style={{
            ...type.caption,
            color: colors.muted,
            textAlign: 'center',
            marginTop: space(2),
            maxWidth: 300,
          }}
        >
          Your data is safe — nothing was written. Going back to Home usually clears it.
        </Text>

        <ScrollView
          style={{
            maxHeight: 120,
            marginTop: space(4),
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            paddingHorizontal: space(3),
          }}
          contentContainerStyle={{ paddingVertical: space(2) }}
        >
          <Text style={{ ...type.tiny, color: colors.faint }} selectable>
            {error.message}
          </Text>
        </ScrollView>

        <Button
          label="Back to Home"
          icon="home-outline"
          onPress={() => {
            this.setState({ error: null });
            this.props.onReset();
          }}
          style={{ marginTop: space(5), minWidth: 200 }}
        />
      </View>
    );
  }
}
