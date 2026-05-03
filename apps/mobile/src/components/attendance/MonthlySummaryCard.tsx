import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../theme';

interface MonthlySummary {
  present: number;
  absent: number;
  late: number;
  half_day: number;
  excused: number;
  leave: number;
  holidays: number;
  working_days: number;
  attendance_rate: number;
}

interface MonthlySummaryCardProps {
  summary: MonthlySummary;
  month: string;   // YYYY-MM
  delay?: number;
}

interface StatItemProps {
  label: string;
  value: number | string;
  color: string;
  pct?: number;
}

function StatItem({ label, value, color, pct }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      {pct !== undefined && (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
        </View>
      )}
    </View>
  );
}

export default function MonthlySummaryCard({ summary, month, delay = 0 }: MonthlySummaryCardProps) {
  const [y, m] = month.split('-');
  const monthName = new Date(Number(y), Number(m) - 1, 1)
    .toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const rate  = summary.attendance_rate;
  const rateColor = rate >= 85 ? COLORS.green : rate >= 65 ? COLORS.amber : COLORS.red;

  const pctOf = (n: number) =>
    summary.working_days > 0 ? Math.round((n / summary.working_days) * 100) : 0;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', delay, damping: 18 }}
      style={styles.card}
    >
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{monthName}</Text>
          <Text style={styles.workingDays}>{summary.working_days} working days</Text>
        </View>
        {/* Rate circle */}
        <View style={[styles.rateCircle, { borderColor: rateColor }]}>
          <Text style={[styles.rateText, { color: rateColor }]}>{rate}%</Text>
          <Text style={styles.rateLabel}>rate</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <StatItem label="Present"  value={summary.present}  color={COLORS.green}  pct={pctOf(summary.present)} />
        <StatItem label="Absent"   value={summary.absent}   color={COLORS.red}    pct={pctOf(summary.absent)} />
        {summary.late > 0 && (
          <StatItem label="Late" value={summary.late} color={COLORS.amber} pct={pctOf(summary.late)} />
        )}
        {summary.half_day > 0 && (
          <StatItem label="Half Day" value={summary.half_day} color="#f97316" pct={pctOf(summary.half_day)} />
        )}
        {summary.leave > 0 && (
          <StatItem label="On Leave" value={summary.leave} color="#22d3ee" pct={pctOf(summary.leave)} />
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerBadge}>
          <View style={[styles.footerDot, { backgroundColor: '#a78bfa' }]} />
          <Text style={styles.footerText}>{summary.holidays} holiday{summary.holidays !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.footerBadge}>
          <View style={[styles.footerDot, { backgroundColor: COLORS.textMuted }]} />
          <Text style={styles.footerText}>{summary.excused} excused</Text>
        </View>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.xl,
    borderWidth:     1,
    borderColor:     COLORS.cardBorder,
    padding:         18,
    marginBottom:    16,
    ...SHADOW.md,
  },
  cardHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   16,
  },
  cardTitle:    { ...FONTS.bold, fontSize: 16, color: COLORS.text },
  workingDays:  { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 3 },

  rateCircle: {
    width:          64,
    height:         64,
    borderRadius:   32,
    borderWidth:    3,
    alignItems:     'center',
    justifyContent: 'center',
  },
  rateText:  { ...FONTS.xbold, fontSize: 16 },
  rateLabel: { ...FONTS.regular, fontSize: 9, color: COLORS.textMuted },

  statsSection: { gap: 10 },

  statItem:   {},
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  statLabel:  { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  statValue:  { ...FONTS.bold, fontSize: 12 },
  barTrack: {
    height:          4,
    backgroundColor: COLORS.surface,
    borderRadius:    2,
    overflow:        'hidden',
  },
  barFill: {
    height:       4,
    borderRadius: 2,
  },

  footer: {
    flexDirection: 'row',
    gap:           16,
    marginTop:     14,
    paddingTop:    12,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  footerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerDot:   { width: 6, height: 6, borderRadius: 3 },
  footerText:  { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },
});
