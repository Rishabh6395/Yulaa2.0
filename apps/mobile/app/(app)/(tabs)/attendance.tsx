import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getAttendance, getHolidays } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function AttendanceScreen() {
  const { user } = useAuth();
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [refreshing, setRefreshing] = useState(false);

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const params = user?.primaryRole === 'admin' || user?.primaryRole === 'principal'
    ? `type=school&month=${monthStr}`
    : `type=employee&teacher_user_id=${user?.id}&month=${monthStr}`;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['attendance', params],
    queryFn: () => getAttendance(params),
    enabled: !!user,
  });

  const { data: holidayData } = useQuery({
    queryKey: ['holidays', String(year)],
    queryFn: () => getHolidays(String(year)),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  function prevMonth() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const records: any[] = data?.attendance ?? data?.records ?? [];
  const holidays: string[] = (holidayData?.holidays ?? []).map((h: any) => h.date);

  const presentDays = records.filter((r: any) => r.status === 'present').length;
  const absentDays  = records.filter((r: any) => r.status === 'absent').length;
  const totalMarked = records.length;
  const percentage  = totalMarked ? Math.round((presentDays / totalMarked) * 100) : 0;

  // Build attendance map: dateStr -> status
  const attMap: Record<string, string> = {};
  records.forEach((r: any) => {
    const d = r.date ?? r.attendance_date;
    if (d) attMap[d] = r.status;
  });

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);

  function getCellStatus(day: number): 'present' | 'absent' | 'holiday' | 'future' | 'none' {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cellDate = new Date(year, month, day);
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (cellDate > todayMid) return 'future';
    if (holidays.includes(dateStr)) return 'holiday';
    const s = attMap[dateStr];
    if (s === 'present') return 'present';
    if (s === 'absent')  return 'absent';
    return 'none';
  }

  const cellColor = {
    present: COLORS.green,
    absent:  COLORS.red,
    holiday: COLORS.amber,
    future:  COLORS.surface,
    none:    COLORS.surface,
  };

  // Class-wise data for admin
  const classSummary: any[] = data?.classSummary ?? data?.classes ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />
        }
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 0, damping: 18 }}
          style={styles.header}
        >
          <Text style={styles.screenTitle}>Attendance</Text>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* Summary cards */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 80, damping: 18 }}
          style={styles.summaryRow}
        >
          <View style={[styles.summaryCard, { borderColor: COLORS.green + '66' }]}>
            <Text style={[styles.summaryVal, { color: COLORS.green }]}>{presentDays}</Text>
            <Text style={styles.summaryLbl}>Present</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: COLORS.red + '66' }]}>
            <Text style={[styles.summaryVal, { color: COLORS.red }]}>{absentDays}</Text>
            <Text style={styles.summaryLbl}>Absent</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: COLORS.brand + '66' }]}>
            <Text style={[styles.summaryVal, { color: COLORS.brand }]}>{percentage}%</Text>
            <Text style={styles.summaryLbl}>Rate</Text>
          </View>
        </MotiView>

        {/* Calendar */}
        <MotiView
          from={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 140, damping: 18 }}
          style={styles.calCard}
        >
          {/* Day headers */}
          <View style={styles.dayHeaders}>
            {DAYS.map((d, i) => (
              <Text key={i} style={styles.dayHeader}>{d}</Text>
            ))}
          </View>

          {isLoading ? (
            <View style={{ padding: 20 }}>
              <SkeletonCard />
            </View>
          ) : (
            <View style={styles.calGrid}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.calCell} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day    = i + 1;
                const status = getCellStatus(day);
                const color  = cellColor[status];
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                return (
                  <View
                    key={day}
                    style={[
                      styles.calCell,
                      { backgroundColor: color + '33' },
                      isToday && styles.calCellToday,
                    ]}
                  >
                    <Text style={[
                      styles.calDayNum,
                      status !== 'future' && status !== 'none' && { color },
                      isToday && { color: COLORS.white },
                    ]}>
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Legend */}
          <View style={styles.legend}>
            {[
              { label: 'Present', color: COLORS.green },
              { label: 'Absent',  color: COLORS.red },
              { label: 'Holiday', color: COLORS.amber },
            ].map(({ label, color }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </MotiView>

        {/* Class-wise summary for admin */}
        {(user?.primaryRole === 'admin' || user?.primaryRole === 'principal') && classSummary.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 240, damping: 18 }}
          >
            <Text style={[styles.screenTitle, { fontSize: 15, marginBottom: 12, marginTop: 8 }]}>
              Class-wise Attendance
            </Text>
            {classSummary.map((cls: any, i: number) => (
              <MotiView
                key={cls.class_id ?? i}
                from={{ opacity: 0, translateX: -16 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'spring', delay: 260 + i * 60, damping: 18 }}
                style={styles.classRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.className}>{cls.class_name ?? cls.name}</Text>
                  <Text style={styles.classInfo}>
                    {cls.present ?? 0} present · {cls.absent ?? 0} absent
                  </Text>
                </View>
                <View style={styles.classPercBox}>
                  <Text style={styles.classPerc}>
                    {cls.total ? Math.round(((cls.present ?? 0) / cls.total) * 100) : 0}%
                  </Text>
                </View>
              </MotiView>
            ))}
          </MotiView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  screenTitle: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  monthNav:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  navArrow:    { ...FONTS.bold, fontSize: 20, color: COLORS.brand },
  monthLabel:  { ...FONTS.bold, fontSize: 15, color: COLORS.text, minWidth: 90, textAlign: 'center' },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  summaryVal: { ...FONTS.xbold, fontSize: 24 },
  summaryLbl: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 3 },

  calCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 20,
    ...SHADOW.sm,
  },
  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader:  { flex: 1, textAlign: 'center', ...FONTS.medium, fontSize: 12, color: COLORS.textMuted },
  calGrid:    { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    marginVertical: 2,
  },
  calCellToday: { backgroundColor: COLORS.brand + '99' },
  calDayNum:    { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted },

  legend:      { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 14 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },

  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    marginBottom: 10,
    ...SHADOW.sm,
  },
  className:    { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  classInfo:    { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 3 },
  classPercBox: {
    backgroundColor: COLORS.brand + '22',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  classPerc: { ...FONTS.bold, fontSize: 16, color: COLORS.brand },
});
