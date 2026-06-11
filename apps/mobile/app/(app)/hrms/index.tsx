import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getPayroll } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { useAuth } from '../../../src/context/AuthContext';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const STATUS_COLOR: Record<string, string> = { draft: '#f59e0b', approved: '#3b82f6', paid: '#10b981' };

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function MonthLabel({ month, year }: { month: number; year: number }) {
  const d = new Date(year, month - 1, 1);
  return <Text>{d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</Text>;
}

function PayslipRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder }}>
      <Text style={{ ...FONTS[bold ? 'bold' : 'regular'], fontSize: 14, color: color ?? COLORS.textMuted }}>{label}</Text>
      <Text style={{ ...FONTS[bold ? 'bold' : 'medium'], fontSize: 14, color: color ?? COLORS.text }}>{value}</Text>
    </View>
  );
}

export default function HRMSScreen() {
  const router   = useRouter();
  const { user } = useAuth();
  const isAdmin  = ['school_admin', 'principal'].includes(user?.primaryRole ?? '');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll'],
    queryFn: () => getPayroll(),
  });

  const payslips: any[] = data?.payroll ?? data?.payslips ?? data?.data ?? [];

  function toggleExpand(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(prev => (prev === id ? null : id));
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />

      <MotiView
        from={{ opacity: 0, translateY: -16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 0, damping: 18 }}
        style={styles.topBar}
      >
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>My Payslips</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={payslips}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const isOpen     = expanded === (item.id ?? String(index));
            const statusColor = STATUS_COLOR[item.status ?? 'draft'] ?? COLORS.textMuted;
            const empName    = item.teacher
              ? `${item.teacher.user?.firstName ?? ''} ${item.teacher.user?.lastName ?? ''}`.trim()
              : '';

            return (
              <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 60, damping: 18 }}>
                <TouchableOpacity style={styles.card} onPress={() => toggleExpand(item.id ?? String(index))} activeOpacity={0.8}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      {isAdmin && empName ? <Text style={styles.empName}>{empName}</Text> : null}
                      <Text style={styles.monthText}>
                        {new Date(item.year ?? 2026, (item.month ?? 1) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
                        <Text style={[styles.badgeText, { color: statusColor }]}>{item.status ?? 'draft'}</Text>
                      </View>
                      <Text style={styles.netSalary}>{fmt(item.netSalary ?? item.net_salary)}</Text>
                    </View>
                  </View>

                  {isOpen && (
                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 200 }} style={styles.breakdown}>
                      <View style={styles.divider} />
                      <Text style={styles.sectionLabel}>Earnings</Text>
                      <PayslipRow label="Basic Salary"     value={fmt(item.basicSalary ?? item.basic_salary)} />
                      <PayslipRow label="HRA"              value={fmt(item.hra)} />
                      <PayslipRow label="DA"               value={fmt(item.da)} />
                      <PayslipRow label="TA"               value={fmt(item.ta)} />
                      {(item.otherAllowances ?? item.other_allowances) > 0 && (
                        <PayslipRow label="Other Allowances" value={fmt(item.otherAllowances ?? item.other_allowances)} />
                      )}
                      <PayslipRow label="Gross Salary" value={fmt(item.grossSalary ?? item.gross_salary)} bold color={COLORS.brand} />

                      <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Deductions</Text>
                      <PayslipRow label="PF (Employee)"  value={fmt(item.pfEmployee ?? item.pf_employee)} color="#ef4444" />
                      <PayslipRow label="ESI (Employee)" value={fmt(item.esiEmployee ?? item.esi_employee)} color="#ef4444" />
                      <PayslipRow label="TDS"            value={fmt(item.tds)} color="#ef4444" />
                      {(item.otherDeductions ?? item.other_deductions) > 0 && (
                        <PayslipRow label="Other Deductions" value={fmt(item.otherDeductions ?? item.other_deductions)} color="#ef4444" />
                      )}

                      <View style={styles.divider} />
                      <PayslipRow label="Net Take-Home" value={fmt(item.netSalary ?? item.net_salary)} bold color="#10b981" />

                      {item.lopDays > 0 && (
                        <Text style={styles.lopNote}>⚠️ {item.lopDays} LOP day{item.lopDays > 1 ? 's' : ''} deducted</Text>
                      )}
                      {item.paidAt && (
                        <Text style={styles.paidAt}>💸 Paid on {new Date(item.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                      )}
                    </MotiView>
                  )}

                  <Text style={styles.expandHint}>{isOpen ? '▲ Less' : '▼ View Payslip'}</Text>
                </TouchableOpacity>
              </MotiView>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💼</Text>
              <Text style={styles.emptyTitle}>No Payslips</Text>
              <Text style={styles.emptySubtitle}>Payslips will appear here once payroll is processed.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.bg },
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:         { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle:  { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  list:         { padding: 20, paddingBottom: 40 },
  card:         { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start' },
  empName:      { ...FONTS.bold, fontSize: 13, color: COLORS.textMuted, marginBottom: 2 },
  monthText:    { ...FONTS.bold, fontSize: 16, color: COLORS.text },
  badge:        { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:    { ...FONTS.bold, fontSize: 12, textTransform: 'capitalize' },
  netSalary:    { ...FONTS.xbold, fontSize: 20, color: '#10b981' },
  breakdown:    { marginTop: 4 },
  divider:      { height: 1, backgroundColor: COLORS.cardBorder, marginVertical: 10 },
  sectionLabel: { ...FONTS.bold, fontSize: 13, color: COLORS.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  lopNote:      { ...FONTS.medium, fontSize: 12, color: '#f59e0b', marginTop: 10 },
  paidAt:       { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
  expandHint:   { ...FONTS.medium, fontSize: 12, color: COLORS.brand, textAlign: 'right', marginTop: 10 },
  emptyState:   { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyEmoji:   { fontSize: 48, marginBottom: 14 },
  emptyTitle:   { ...FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: 6 },
  emptySubtitle:{ ...FONTS.regular, fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
