import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, RADIUS } from '../../theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, loading, variant = 'primary', disabled, style }: Props) {
  const bg =
    variant === 'primary'   ? COLORS.brand
    : variant === 'secondary' ? COLORS.surface
    : variant === 'danger'    ? '#7f1d1d'
    : 'transparent';

  const border = variant === 'ghost' ? COLORS.cardBorder : undefined;

  async function handle() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  return (
    <TouchableOpacity
      onPress={handle}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.btn,
        {
          backgroundColor: bg,
          borderWidth: border ? 1 : 0,
          borderColor: border,
          opacity: disabled || loading ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={COLORS.white} size="small" />
        : <Text style={[styles.label, variant === 'ghost' && { color: COLORS.textMuted }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...FONTS.bold,
    color: COLORS.white,
    fontSize: 15,
  },
});
