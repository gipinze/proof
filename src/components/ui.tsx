import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space, tabular, type } from '../theme';

const TOP_INSET =
  Platform.OS === 'android' ? Math.max(StatusBar.currentHeight ?? 0, 24) + 10 : 54;

export { TOP_INSET };

export function Screen({
  children,
  scroll = false,
  contentStyle,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  const inner = (
    <View style={[{ paddingHorizontal: space(4), paddingTop: TOP_INSET }, contentStyle]}>{children}</View>
  );
  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>{inner}</View>;
  }
  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: colors.bg }, style]}
      contentContainerStyle={{ paddingBottom: space(28) }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {inner}
    </ScrollView>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  left,
  right,
}: {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
        {left}
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.display, color: colors.text }}>{title}</Text>
          {subtitle ? (
            <Text style={{ ...type.caption, color: colors.muted, marginTop: 2 }}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {right}
    </View>
  );
}

export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={{ ...type.tiny, color: colors.faint, textTransform: 'uppercase' }}>{children}</Text>
      {right}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.75 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Stat({
  label,
  value,
  unit,
  size = 'md',
  align = 'left',
  muted,
}: {
  label: string;
  value: string;
  unit?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'center';
  muted?: boolean;
}) {
  const fontSize = size === 'xl' ? 40 : size === 'lg' ? 30 : size === 'md' ? 22 : 16;
  return (
    <View style={{ alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      <Text style={{ ...type.tiny, color: colors.faint, textTransform: 'uppercase', marginBottom: 3 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <Text
          style={{
            fontSize,
            fontWeight: '800',
            color: muted ? colors.muted : colors.text,
            letterSpacing: -0.8,
            ...tabular,
          }}
        >
          {value}
        </Text>
        {unit ? (
          <Text style={{ fontSize: fontSize * 0.5, fontWeight: '700', color: colors.muted }}>{unit}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'surface';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    variant === 'primary' ? colors.accent : variant === 'surface' ? colors.surfaceHi : 'transparent';
  const fg = variant === 'primary' ? '#FFFFFF' : colors.text;
  const border = variant === 'ghost' ? colors.border : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'ghost' ? 1 : 0,
          paddingVertical: 15,
          paddingHorizontal: space(5),
          borderRadius: radius.pill,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space(2),
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={{ fontSize: 15, fontWeight: '800', color: fg, letterSpacing: 0.2 }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  size = 38,
  color = colors.text,
  bg = colors.surfaceHi,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  bg?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={size * 0.48} color={color} />
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: space(3.5),
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.accent : colors.surfaceAlt,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: active ? '#FFF' : colors.muted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Empty({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space(14), gap: space(2) }}>
      <Ionicons name={icon} size={30} color={colors.faint} />
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{title}</Text>
      <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', maxWidth: 260, lineHeight: 19 }}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: space(5), gap: space(2) },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space(2.5),
    marginTop: space(5),
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space(4),
  },
});
