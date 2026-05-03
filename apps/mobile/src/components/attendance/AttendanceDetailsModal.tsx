import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { MotiView } from 'moti';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';
import { STATUS_CFG, type DayCellStatus } from './CalendarDayCell';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DayDetail {
  date: string;                   // YYYY-MM-DD
  status: string | null;
  punch_in_time: string | null;
  punch_out_time: string | null;
  working_hours: number | null;
  is_holiday: boolean;
  holiday_name: string | null;
  is_leave: boolean;
  leave_type: string | null;
  is_weekoff: boolean;
}

interface AttendanceDetailsModalProps {
  visible: boolean;
  detail: DayDetail | null;
  onClose: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AttendanceDetailsModal({ visible, detail, onClose }: AttendanceDetailsModalProps) {
  if (!detail) return null;

  const status = (detail.status ?? 'none') as DayCellStatus;
  const cfg    = STATUS_CFG[status] ?? STATUS_CFG.none;

  const formattedDate = (() => {
    try {
      return new Date(detail.date).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { return detail.date; }
  })();

  const workingHoursStr = detail.working_hours != null
    ? `${detail.working_hours}h`
    : '—';

  const workingHoursColor = detail.working_hours != null
    ? detail.working_hours >= 8 ? COLORS.green
    : detail.working_hours >= 4 ? COLORS.amber
    : COLORS.red
    : COLORS.textMuted;

  const STATUS_FULL: Partial<Record<string, string>> = {
    present: 'Present', absent: 'Absent', late: 'Late',
    half_day: 'Half Day', excused: 'Excused',
    holiday: 'Holiday', leave: 'On Leave', weekoff: 'Week Off',
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        <MotiView
          from={{ translateY: 60, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          exit={{ translateY: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 180 }}
          style={styles.sheet}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Day Details</Text>
              <Text style={styles.headerDate}>{formattedDate}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Status badge */}
            {cfg.label !== '' && (
              <View style={[styles.statusBadge, { backgroundColor: cfg.dimBg }]}>
                <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                <Text style={[styles.statusText, { color: cfg.color }]}>
                  {STATUS_FULL[status] ?? status}
                </Text>
              </View>
            )}

            {/* Holiday / Leave notice */}
            {detail.is_holiday && (
              <View style={[styles.noticeBanner, { backgroundColor: '#7c3aed18', borderColor: '#a78bfa55' }]}>
                <Text style={[styles.noticeText, { color: '#a78bfa' }]}>
                  🎉  {detail.holiday_name ?? 'Public Holiday'}
                </Text>
              </View>
            )}
            {detail.is_leave && (
              <View style={[styles.noticeBanner, { backgroundColor: '#0891b218', borderColor: '#22d3ee55' }]}>
                <Text style={[styles.noticeText, { color: '#22d3ee' }]}>
                  📋  {detail.leave_type ? detail.leave_type.charAt(0).toUpperCase() + detail.leave_type.slice(1) : 'Approved'} Leave
                </Text>
              </View>
            )}

            {/* Punch times */}
            <View style={styles.infoCard}>
              <InfoRow label="Check In"      value={detail.punch_in_time  ?? '—'} valueColor={detail.punch_in_time  ? COLORS.text : COLORS.textMuted} />
              <View style={styles.divider} />
              <InfoRow label="Check Out"     value={detail.punch_out_time ?? '—'} valueColor={detail.punch_out_time ? COLORS.text : COLORS.textMuted} />
              <View style={styles.divider} />
              <InfoRow label="Working Hours" value={workingHoursStr} valueColor={workingHoursColor} />
            </View>

            {/* Working hours progress bar */}
            {detail.working_hours != null && (
              <View style={styles.hoursBarSection}>
                <View style={styles.hoursBarHeader}>
                  <Text style={styles.hoursBarLabel}>Hours worked</Text>
                  <Text style={[styles.hoursBarValue, { color: workingHoursColor }]}>
                    {detail.working_hours}h / 8h
                  </Text>
                </View>
                <View style={styles.hoursTrack}>
                  <View
                    style={[
                      styles.hoursFill,
                      {
                        width: `${Math.min(100, (detail.working_hours / 8) * 100)}%` as any,
                        backgroundColor: workingHoursColor,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Close button */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.8}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent:  'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    borderWidth:          1,
    borderBottomWidth:    0,
    borderColor:          COLORS.cardBorder,
    paddingBottom:        Platform.OS === 'ios' ? 34 : 20,
    maxHeight:            '75%',
    ...SHADOW.lg,
  },
  handle: {
    width:        40,
    height:       4,
    borderRadius: 2,
    backgroundColor: COLORS.cardBorder,
    alignSelf:    'center',
    marginTop:    12,
    marginBottom: 4,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    paddingHorizontal: 20,
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerTitle: { ...FONTS.bold, fontSize: 17, color: COLORS.text },
  headerDate:  { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 3 },
  closeBtn:      { padding: 4 },
  closeBtnText:  { ...FONTS.bold, fontSize: 16, color: COLORS.textMuted },

  body: { paddingHorizontal: 20, paddingTop: 16, gap: 14, paddingBottom: 8 },

  statusBadge: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    alignSelf:      'flex-start',
    paddingHorizontal: 14,
    paddingVertical:    8,
    borderRadius:    RADIUS.full,
  },
  statusDot:  { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...FONTS.bold, fontSize: 14 },

  noticeBanner: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    padding:        12,
    borderRadius:   RADIUS.md,
    borderWidth:    1,
  },
  noticeText: { ...FONTS.medium, fontSize: 14 },

  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius:    RADIUS.lg,
    borderWidth:     1,
    borderColor:     COLORS.cardBorder,
    overflow:        'hidden',
  },
  infoRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: 16,
    paddingVertical:   13,
  },
  infoLabel: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted },
  infoValue: { ...FONTS.medium,  fontSize: 14, color: COLORS.text,     fontVariant: ['tabular-nums'] as any },
  divider:   { height: 1, backgroundColor: COLORS.cardBorder, marginHorizontal: 16 },

  hoursBarSection: { gap: 8 },
  hoursBarHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  hoursBarLabel:  { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  hoursBarValue:  { ...FONTS.medium,  fontSize: 12 },
  hoursTrack: {
    height:          8,
    backgroundColor: COLORS.surface,
    borderRadius:    4,
    overflow:        'hidden',
  },
  hoursFill: {
    height:       8,
    borderRadius: 4,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop:        12,
    borderTopWidth:    1,
    borderTopColor:    COLORS.cardBorder,
  },
  closeButton: {
    backgroundColor: COLORS.surface,
    borderRadius:    RADIUS.lg,
    paddingVertical: 14,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     COLORS.cardBorder,
  },
  closeButtonText: { ...FONTS.bold, fontSize: 15, color: COLORS.text },
});
