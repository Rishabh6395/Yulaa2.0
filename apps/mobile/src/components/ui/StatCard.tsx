import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  index?: number;
}

export function StatCard({ label, value, sub, color = COLORS.brand, index = 0 }: Props) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', delay: index * 100, damping: 16 }}
      style={styles.wrap}
    >
      <LinearGradient
        colors={[color + '22', color + '08']}
        style={styles.gradient}
      >
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.value, { color }]}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
        {sub && <Text style={styles.sub}>{sub}</Text>}
      </LinearGradient>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 140,
    margin: 4,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  gradient: {
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  dot:   { width: 6, height: 6, borderRadius: 3, marginBottom: 10 },
  value: { ...FONTS.xbold, fontSize: 28, marginBottom: 2 },
  label: {
    ...FONTS.medium,
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sub: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
