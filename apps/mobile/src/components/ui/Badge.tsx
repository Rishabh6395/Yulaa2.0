import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../../theme';

const CONFIG: Record<string, { bg: string; text: string }> = {
  submitted:    { bg: '#78350f33', text: '#f59e0b' },
  under_review: { bg: '#1e3a5f',   text: '#60a5fa' },
  approved:     { bg: '#14532d44', text: '#22c55e' },
  rejected:     { bg: '#7f1d1d44', text: '#ef4444' },
  pending:      { bg: '#78350f33', text: '#f59e0b' },
  active:       { bg: '#14532d44', text: '#22c55e' },
  inactive:     { bg: '#1a2540',   text: '#7a9bb5' },
  paid:         { bg: '#14532d44', text: '#22c55e' },
  unpaid:       { bg: '#7f1d1d44', text: '#ef4444' },
  partial:      { bg: '#78350f33', text: '#f59e0b' },
  present:      { bg: '#14532d44', text: '#22c55e' },
  absent:       { bg: '#7f1d1d44', text: '#ef4444' },
  holiday:      { bg: '#78350f33', text: '#f59e0b' },
  general:      { bg: '#1e3a5f',   text: '#60a5fa' },
  academic:     { bg: '#14532d44', text: '#22c55e' },
  events:       { bg: '#2d1b4e',   text: '#a78bfa' },
};

export function Badge({ status }: { status: string }) {
  const key = status?.toLowerCase?.() ?? '';
  const cfg = CONFIG[key] ?? { bg: COLORS.surface, text: COLORS.textMuted };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.text }]}>{status.replace(/_/g, ' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  text:  { ...FONTS.medium, fontSize: 11, textTransform: 'capitalize' },
});
