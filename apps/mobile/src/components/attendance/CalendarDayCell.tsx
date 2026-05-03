import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../../theme';

// ─── Status config ────────────────────────────────────────────────────────────

export type DayCellStatus =
  | 'present' | 'absent' | 'late' | 'half_day'
  | 'excused' | 'holiday' | 'leave' | 'weekoff' | 'future' | 'none';

export const STATUS_CFG: Record<DayCellStatus, {
  label: string;
  color: string;
  bg: string;
  dimBg: string;
}> = {
  present:  { label: 'P', color: COLORS.green,        bg: '#16a34a',  dimBg: COLORS.green  + '28' },
  absent:   { label: 'A', color: COLORS.red,          bg: '#dc2626',  dimBg: COLORS.red    + '28' },
  late:     { label: 'L', color: COLORS.amber,        bg: '#d97706',  dimBg: COLORS.amber  + '28' },
  half_day: { label: 'H', color: '#f97316',           bg: '#ea580c',  dimBg: '#f9731628' },
  excused:  { label: 'E', color: '#3b82f6',           bg: '#2563eb',  dimBg: '#3b82f628' },
  holiday:  { label: '✦', color: '#a78bfa',           bg: '#7c3aed',  dimBg: '#a78bfa28' },
  leave:    { label: 'L', color: '#22d3ee',           bg: '#0891b2',  dimBg: '#22d3ee28' },
  weekoff:  { label: '',  color: COLORS.textMuted,    bg: 'transparent', dimBg: 'transparent' },
  future:   { label: '',  color: COLORS.textMuted,    bg: 'transparent', dimBg: 'transparent' },
  none:     { label: '',  color: COLORS.textMuted,    bg: 'transparent', dimBg: 'transparent' },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface CalendarDayCellProps {
  day: number;
  status: DayCellStatus;
  isToday: boolean;
  hasPunchIn?: boolean;
  onPress?: () => void;
}

export default function CalendarDayCell({
  day,
  status,
  isToday,
  hasPunchIn = false,
  onPress,
}: CalendarDayCellProps) {
  const cfg       = STATUS_CFG[status];
  const isInactive = status === 'future' || status === 'weekoff' || status === 'none';
  const hasLabel   = cfg.label !== '';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isInactive || !onPress}
      activeOpacity={0.7}
      style={[
        styles.cell,
        { backgroundColor: isInactive ? 'transparent' : cfg.dimBg },
        isToday && styles.todayCell,
      ]}
    >
      <Text style={[
        styles.dayNum,
        { color: isInactive ? COLORS.surface : cfg.color },
        isToday && styles.todayText,
      ]}>
        {day}
      </Text>
      {hasLabel && (
        <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
      )}
      {/* Punch-in dot indicator */}
      {hasPunchIn && !isInactive && (
        <View style={[styles.punchDot, { backgroundColor: cfg.color }]} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    width:          `${100 / 7}%` as any,
    aspectRatio:    1,
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   RADIUS.sm,
    marginVertical: 2,
    position:       'relative',
  },
  todayCell: {
    borderWidth: 2,
    borderColor: COLORS.brand,
  },
  dayNum: {
    ...FONTS.medium,
    fontSize: 13,
    lineHeight: 16,
  },
  todayText: {
    ...FONTS.bold,
    color: COLORS.brand,
  },
  statusLabel: {
    fontSize:   8,
    ...FONTS.bold,
    lineHeight: 10,
    marginTop:  1,
  },
  punchDot: {
    position:     'absolute',
    bottom:       3,
    right:        3,
    width:        4,
    height:       4,
    borderRadius: 2,
  },
});
