import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import {
  getAttendanceMonthly,
  checkIn,
  checkOut,
  getHolidays,
  getAttendance,
} from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import CalendarDayCell, { STATUS_CFG, type DayCellStatus } from '../../../src/components/attendance/CalendarDayCell';
import MonthlySummaryCard from '../../../src/components/attendance/MonthlySummaryCard';
import AttendanceDetailsModal, { type DayDetail } from '../../../src/components/attendance/AttendanceDetailsModal';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS   = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const EMPLOYEE_ROLES = ['teacher', 'school_admin', 'principal', 'hod', 'employee'];
const ADMIN_ROLES    = ['school_admin', 'principal', 'super_admin'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyRecord {
  date: string;
  day_of_week: number;
  status: string;
  punch_in_time: string | null;
  punch_out_time: string | null;
  working_hours: number | null;
  is_holiday: boolean;
  holiday_name: string | null;
  is_leave: boolean;
  leave_type: string | null;
  is_weekoff: boolean;
}

interface Summary {
  present: number; absent: number; late: number; half_day: number;
  excused: number; leave: number; holidays: number; weekoffs: number;
  working_days: number; attendance_rate: number;
}

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND_ITEMS: { status: DayCellStatus; label: string }[] = [
  { status: 'present',  label: 'Present' },
  { status: 'absent',   label: 'Absent' },
  { status: 'late',     label: 'Late' },
  { status: 'half_day', label: 'Half Day' },
  { status: 'leave',    label: 'Leave' },
  { status: 'holiday',  label: 'Holiday' },
];

function Legend() {
  return (
    <View style={styles.legend}>
      {LEGEND_ITEMS.map(({ status, label }) => {
        const cfg = STATUS_CFG[status];
        return (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
            <Text style={styles.legendLabel}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AttendanceCalendarScreen() {
  const { user } = useAuth();
  const qc      = useQueryClient();
  const today   = new Date();

  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<DayDetail | null>(null);
  const [modalVisible,   setModalVisible]   = useState(false);

  const isEmployee = EMPLOYEE_ROLES.includes(user?.primaryRole ?? '');
  const isAdmin    = ADMIN_ROLES.includes(user?.primaryRole ?? '');

  const monthStr     = `${year}-${String(month + 1).padStart(2, '0')}`;
  const isCurrentMo  = year === today.getFullYear() && month === today.getMonth();
  const todayStr     = today.toISOString().split('T')[0];

  // ── Data fetching ──────────────────────────────────────────────────────────

  // Employee: rich monthly data from /api/attendance/monthly
  const { data: monthlyData, isLoading: monthlyLoading, refetch: refetchMonthly, error: monthlyError } = useQuery({
    queryKey: ['attendance-monthly', monthStr, user?.id],
    queryFn:  () => getAttendanceMonthly(monthStr),
    enabled:  !!user && isEmployee,
  });

  // Admin: class-wise summary from existing endpoint
  const adminParams = `type=school&month=${monthStr}`;
  const { data: adminData, isLoading: adminLoading, refetch: refetchAdmin } = useQuery({
    queryKey: ['attendance-admin', adminParams],
    queryFn:  () => getAttendance(adminParams),
    enabled:  !!user && isAdmin && !isEmployee,
  });

  // Holidays for admin / fallback
  const { data: holidayData } = useQuery({
    queryKey: ['holidays', String(year)],
    queryFn:  () => getHolidays(String(year)),
    enabled:  !!user,
  });

  // ── Punch in / out mutations ───────────────────────────────────────────────

  const punchIn = useMutation({
    mutationFn: checkIn,
    onSuccess:  (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Checked In', `Recorded at ${data.time ? new Date(data.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'now'}`);
      qc.invalidateQueries({ queryKey: ['attendance-monthly'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message ?? 'Check-in failed'),
  });

  const punchOut = useMutation({
    mutationFn: checkOut,
    onSuccess:  (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Checked Out', `Recorded at ${data.time ? new Date(data.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'now'}`);
      qc.invalidateQueries({ queryKey: ['attendance-monthly'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message ?? 'Check-out failed'),
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

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
  function goToToday() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMonth(today.getMonth());
    setYear(today.getFullYear());
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchMonthly(), refetchAdmin()]);
    setRefreshing(false);
  }, [refetchMonthly, refetchAdmin]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const records: MonthlyRecord[] = monthlyData?.records ?? [];
  const summary: Summary | null  = monthlyData?.summary ?? null;

  const recordMap = useMemo(() => {
    const m: Record<string, MonthlyRecord> = {};
    records.forEach(r => { m[r.date] = r; });
    return m;
  }, [records]);

  const todayRecord = recordMap[todayStr];

  // For admin: fallback simple calendar from legacy endpoint
  const legacyRecords: any[] = adminData?.attendance ?? adminData?.records ?? [];
  const legacyMap: Record<string, string> = {};
  legacyRecords.forEach((r: any) => {
    const d = r.date ?? r.attendance_date;
    if (d) legacyMap[d] = r.status;
  });

  const holidays: string[] = (holidayData?.holidays ?? []).map((h: any) =>
    new Date(h.date).toISOString().split('T')[0]
  );

  // Calendar grid setup
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth    = new Date(year, month + 1, 0).getDate();

  function getCellStatus(day: number): DayCellStatus {
    const ds       = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cellDate = new Date(year, month, day);
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (cellDate > todayMid) return 'future';

    if (isEmployee && records.length > 0) {
      const rec = recordMap[ds];
      if (!rec) return 'none';
      return rec.status as DayCellStatus;
    }

    // Admin / parent fallback
    if (holidays.includes(ds)) return 'holiday';
    const s = legacyMap[ds];
    if (s) return s as DayCellStatus;
    return 'none';
  }

  function openDay(day: number) {
    const ds  = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const rec = recordMap[ds];
    if (!rec) return;
    Haptics.selectionAsync();
    setSelectedDetail({
      date:           ds,
      status:         rec.status,
      punch_in_time:  rec.punch_in_time,
      punch_out_time: rec.punch_out_time,
      working_hours:  rec.working_hours,
      is_holiday:     rec.is_holiday,
      holiday_name:   rec.holiday_name,
      is_leave:       rec.is_leave,
      leave_type:     rec.leave_type,
      is_weekoff:     rec.is_weekoff,
    });
    setModalVisible(true);
  }

  const isLoading = isEmployee ? monthlyLoading : adminLoading;

  // Class-wise for admin
  const classSummary: any[] = adminData?.classSummary ?? adminData?.classes ?? [];

  // ── Punch button states ────────────────────────────────────────────────────

  const canCheckIn  = isEmployee && isCurrentMo && !todayRecord?.punch_in_time;
  const canCheckOut = isEmployee && isCurrentMo && !!todayRecord?.punch_in_time && !todayRecord?.punch_out_time;
  const isPunchingIn  = punchIn.isPending;
  const isPunchingOut = punchOut.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brand}
            colors={[COLORS.brand]}
          />
        }
      >
        {/* ── Header ── */}
        <MotiView
          from={{ opacity: 0, translateY: -16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 0, damping: 18 }}
          style={styles.pageHeader}
        >
          <View>
            <Text style={styles.pageTitle}>Attendance</Text>
            <Text style={styles.pageSubtitle}>
              {isAdmin && !isEmployee ? 'School overview' : 'Your attendance history'}
            </Text>
          </View>
          {/* Today button */}
          {!isCurrentMo && (
            <TouchableOpacity onPress={goToToday} style={styles.todayBtn} activeOpacity={0.8}>
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
          )}
        </MotiView>

        {/* ── Check In / Out buttons ── */}
        {isEmployee && isCurrentMo && (
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 40, damping: 18 }}
            style={styles.punchRow}
          >
            <TouchableOpacity
              style={[
                styles.punchBtn,
                { backgroundColor: canCheckIn ? COLORS.green : COLORS.surface },
                !canCheckIn && styles.punchBtnDisabled,
              ]}
              onPress={() => canCheckIn && punchIn.mutate()}
              disabled={!canCheckIn || isPunchingIn}
              activeOpacity={0.8}
            >
              {isPunchingIn
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <>
                    <Text style={styles.punchIcon}>→</Text>
                    <Text style={[styles.punchLabel, !canCheckIn && styles.punchLabelDim]}>
                      {todayRecord?.punch_in_time ? `In: ${todayRecord.punch_in_time}` : 'Check In'}
                    </Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.punchBtn,
                { backgroundColor: canCheckOut ? COLORS.red : COLORS.surface },
                !canCheckOut && styles.punchBtnDisabled,
              ]}
              onPress={() => canCheckOut && punchOut.mutate()}
              disabled={!canCheckOut || isPunchingOut}
              activeOpacity={0.8}
            >
              {isPunchingOut
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <>
                    <Text style={styles.punchIcon}>←</Text>
                    <Text style={[styles.punchLabel, !canCheckOut && styles.punchLabelDim]}>
                      {todayRecord?.punch_out_time ? `Out: ${todayRecord.punch_out_time}` : 'Check Out'}
                    </Text>
                  </>
              }
            </TouchableOpacity>
          </MotiView>
        )}

        {/* ── Month navigation ── */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', delay: 60, duration: 200 }}
          style={styles.monthNav}
        >
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn} activeOpacity={0.7}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn} activeOpacity={0.7}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </MotiView>

        {/* ── Calendar card ── */}
        <MotiView
          from={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 100, damping: 18 }}
          style={styles.calCard}
        >
          {/* Day headers */}
          <View style={styles.dayHeaders}>
            {DAYS.map((d, i) => (
              <Text key={i} style={[styles.dayHeader, i === 0 || i === 6 ? styles.dayHeaderWeekend : {}]}>{d}</Text>
            ))}
          </View>

          {isLoading ? (
            <View style={{ padding: 16 }}>
              <SkeletonCard />
            </View>
          ) : monthlyError && isEmployee ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>Failed to load attendance</Text>
              <TouchableOpacity onPress={() => refetchMonthly()} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.calGrid}>
              {/* Padding cells */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <View key={`pad-${i}`} style={styles.padCell} />
              ))}
              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day    = i + 1;
                const ds     = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const status = getCellStatus(day);
                const rec    = recordMap[ds];
                const isToday = ds === todayStr;
                return (
                  <CalendarDayCell
                    key={ds}
                    day={day}
                    status={status}
                    isToday={isToday}
                    hasPunchIn={!!rec?.punch_in_time}
                    onPress={isEmployee && rec ? () => openDay(day) : undefined}
                  />
                );
              })}
            </View>
          )}

          {/* Legend */}
          <Legend />
        </MotiView>

        {/* ── Monthly Summary (employee) ── */}
        {isEmployee && summary && (
          <MonthlySummaryCard
            summary={summary}
            month={monthStr}
            delay={200}
          />
        )}

        {/* ── Quick stats row (employee, no summary card) ── */}
        {isEmployee && !summary && !isLoading && (
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 180, damping: 18 }}
            style={styles.statsRow}
          >
            {(() => {
              const presentDays = legacyRecords.filter((r: any) => r.status === 'present').length;
              const absentDays  = legacyRecords.filter((r: any) => r.status === 'absent').length;
              const total       = legacyRecords.length;
              const pct         = total ? Math.round((presentDays / total) * 100) : 0;
              return [
                { label: 'Present', val: presentDays, color: COLORS.green },
                { label: 'Absent',  val: absentDays,  color: COLORS.red },
                { label: 'Rate',    val: `${pct}%`,   color: COLORS.brand },
              ];
            })().map(({ label, val, color }) => (
              <View key={label} style={[styles.statCard, { borderColor: color + '66' }]}>
                <Text style={[styles.statVal, { color }]}>{val}</Text>
                <Text style={styles.statLbl}>{label}</Text>
              </View>
            ))}
          </MotiView>
        )}

        {/* ── Class-wise (admin) ── */}
        {isAdmin && !isEmployee && classSummary.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 200, damping: 18 }}
          >
            <Text style={styles.sectionTitle}>Class-wise Attendance</Text>
            {classSummary.map((cls: any, i: number) => (
              <MotiView
                key={cls.class_id ?? i}
                from={{ opacity: 0, translateX: -12 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'spring', delay: 220 + i * 50, damping: 18 }}
                style={styles.classRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.className}>{cls.class_name ?? cls.name ?? `${cls.grade} ${cls.section}`}</Text>
                  <Text style={styles.classInfo}>
                    {cls.present ?? 0} present · {cls.absent ?? 0} absent
                    {cls.late ? ` · ${cls.late} late` : ''}
                  </Text>
                </View>
                <LinearGradient
                  colors={[COLORS.brand + '33', COLORS.brand + '11']}
                  style={styles.classPercBox}
                >
                  <Text style={styles.classPerc}>
                    {cls.total ? Math.round(((cls.present ?? 0) / cls.total) * 100) : 0}%
                  </Text>
                </LinearGradient>
              </MotiView>
            ))}
          </MotiView>
        )}

        {/* ── Empty state ── */}
        {!isLoading && !monthlyError && isEmployee && records.length === 0 && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', delay: 300, duration: 300 }}
            style={styles.emptyState}
          >
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No attendance data</Text>
            <Text style={styles.emptySubtitle}>No records found for {MONTHS[month]} {year}</Text>
          </MotiView>
        )}
      </ScrollView>

      {/* ── Details Modal ── */}
      <AttendanceDetailsModal
        visible={modalVisible}
        detail={selectedDetail}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 48 },

  // Header
  pageHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   20,
  },
  pageTitle:    { ...FONTS.xbold, fontSize: 24, color: COLORS.text },
  pageSubtitle: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 3 },
  todayBtn: {
    backgroundColor: COLORS.brand + '22',
    borderRadius:    RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderWidth:       1,
    borderColor:       COLORS.brand + '44',
  },
  todayBtnText: { ...FONTS.bold, fontSize: 13, color: COLORS.brand },

  // Punch buttons
  punchRow: {
    flexDirection: 'row',
    gap:           12,
    marginBottom:  20,
  },
  punchBtn: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    paddingVertical: 14,
    borderRadius:   RADIUS.lg,
    borderWidth:    1,
    borderColor:    COLORS.cardBorder,
    ...SHADOW.sm,
  },
  punchBtnDisabled: { opacity: 0.5 },
  punchIcon:  { ...FONTS.bold, fontSize: 16, color: COLORS.white },
  punchLabel: { ...FONTS.bold, fontSize: 14, color: COLORS.white },
  punchLabelDim: { color: COLORS.textMuted },

  // Month navigation
  monthNav: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            12,
    marginBottom:   14,
  },
  navBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  navArrow:  { ...FONTS.bold, fontSize: 22, color: COLORS.brand },
  monthLabel: { ...FONTS.bold, fontSize: 16, color: COLORS.text, minWidth: 110, textAlign: 'center' },

  // Calendar
  calCard: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.xl,
    borderWidth:     1,
    borderColor:     COLORS.cardBorder,
    padding:         14,
    marginBottom:    18,
    ...SHADOW.sm,
  },
  dayHeaders:      { flexDirection: 'row', marginBottom: 6 },
  dayHeader:       { flex: 1, textAlign: 'center', ...FONTS.medium, fontSize: 11, color: COLORS.textMuted },
  dayHeaderWeekend:{ color: COLORS.brand + 'aa' },
  calGrid:  { flexDirection: 'row', flexWrap: 'wrap' },
  padCell:  { width: `${100 / 7}%` as any, aspectRatio: 1 },

  // Legend
  legend:      { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 14 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 7, height: 7, borderRadius: 3.5 },
  legendLabel: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted },

  // Quick stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex:           1,
    backgroundColor: COLORS.card,
    borderRadius:   RADIUS.lg,
    borderWidth:    1,
    padding:        14,
    alignItems:     'center',
    ...SHADOW.sm,
  },
  statVal: { ...FONTS.xbold, fontSize: 22 },
  statLbl: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 3 },

  // Admin class rows
  sectionTitle: { ...FONTS.bold, fontSize: 15, color: COLORS.text, marginBottom: 12, marginTop: 4 },
  classRow: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: COLORS.card,
    borderRadius:   RADIUS.lg,
    borderWidth:    1,
    borderColor:    COLORS.cardBorder,
    padding:        14,
    marginBottom:   10,
    ...SHADOW.sm,
  },
  className:    { ...FONTS.bold, fontSize: 14, color: COLORS.text },
  classInfo:    { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  classPercBox: {
    borderRadius:    RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical:   8,
    alignItems:       'center',
  },
  classPerc: { ...FONTS.bold, fontSize: 16, color: COLORS.brand },

  // Error
  errorBox: {
    padding:     24,
    alignItems:  'center',
    gap:         12,
  },
  errorText:  { ...FONTS.medium, fontSize: 14, color: COLORS.textMuted },
  retryBtn:   { backgroundColor: COLORS.brand + '22', paddingHorizontal: 20, paddingVertical: 8, borderRadius: RADIUS.md },
  retryText:  { ...FONTS.bold, fontSize: 13, color: COLORS.brand },

  // Empty state
  emptyState: {
    alignItems:  'center',
    paddingVertical: 32,
    gap:         8,
  },
  emptyIcon:     { fontSize: 40 },
  emptyTitle:    { ...FONTS.bold, fontSize: 16, color: COLORS.textMuted },
  emptySubtitle: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted + 'aa' },
});
