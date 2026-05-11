import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { getOnlineClassAttendance, saveOnlineClassAttendance } from '../../../../src/api/client';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../../src/theme';

export default function OnlineClassAttendanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const [records, setRecords] = useState<Record<string, 'present' | 'absent'>>({});
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['oc-attendance', id],
    queryFn:  () => getOnlineClassAttendance(id!),
    onSuccess: (d: any) => {
      const init: Record<string, 'present' | 'absent'> = {};
      (d.students ?? []).forEach((s: any) => {
        init[s.id] = s.attendance?.status ?? 'absent';
      });
      setRecords(init);
    },
  });

  const students: any[] = data?.students ?? [];

  const saveMut = useMutation({
    mutationFn: saveOnlineClassAttendance,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  function toggle(studentId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecords(prev => ({ ...prev, [studentId]: prev[studentId] === 'present' ? 'absent' : 'present' }));
  }
  function setAll(status: 'present' | 'absent') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next: Record<string, 'present' | 'absent'> = {};
    students.forEach(s => { next[s.id] = status; });
    setRecords(next);
  }
  function save() {
    const attendance = students.map(s => ({ student_id: s.id, status: records[s.id] ?? 'absent' }));
    saveMut.mutate({ online_class_id: id, attendance });
  }

  const presentCount = Object.values(records).filter(v => v === 'present').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 18 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Attendance</Text>
            <Text style={styles.subtitle}>{presentCount} / {students.length} present</Text>
          </View>
        </MotiView>

        <View style={styles.bulkRow}>
          <TouchableOpacity style={[styles.bulkBtn, { backgroundColor: COLORS.green + '22', borderColor: COLORS.green + '44' }]} onPress={() => setAll('present')} activeOpacity={0.8}>
            <Text style={[styles.bulkText, { color: COLORS.green }]}>All Present</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bulkBtn, { backgroundColor: COLORS.red + '22', borderColor: COLORS.red + '44' }]} onPress={() => setAll('absent')} activeOpacity={0.8}>
            <Text style={[styles.bulkText, { color: COLORS.red }]}>All Absent</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color={COLORS.brand} style={{ marginTop: 40 }} />
        ) : students.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No students found</Text>
          </View>
        ) : (
          students.map((s: any, i: number) => {
            const status = records[s.id] ?? 'absent';
            const isPresent = status === 'present';
            return (
              <MotiView key={s.id} from={{ opacity: 0, translateX: -12 }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: 'spring', delay: i * 40, damping: 18 }}>
                <TouchableOpacity style={styles.studentRow} onPress={() => toggle(s.id)} activeOpacity={0.8}>
                  <View style={[styles.statusDot, { backgroundColor: isPresent ? COLORS.green : COLORS.red }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName}>{s.firstName} {s.lastName}</Text>
                    {s.admissionNo && <Text style={styles.admissionNo}>{s.admissionNo}</Text>}
                  </View>
                  <View style={[styles.badge, { backgroundColor: isPresent ? COLORS.green + '22' : COLORS.red + '22' }]}>
                    <Text style={[styles.badgeText, { color: isPresent ? COLORS.green : COLORS.red }]}>
                      {isPresent ? 'Present' : 'Absent'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </MotiView>
            );
          })
        )}

        <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 200, damping: 18 }} style={styles.saveRow}>
          <TouchableOpacity
            style={[styles.saveBtn, saveMut.isPending && { opacity: 0.6 }]}
            onPress={save}
            disabled={saveMut.isPending || students.length === 0}
            activeOpacity={0.8}
          >
            {saveMut.isPending
              ? <ActivityIndicator size="small" color={COLORS.white} />
              : <Text style={styles.saveBtnText}>{saved ? '✓ Saved!' : 'Save Attendance'}</Text>
            }
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 48 },

  header:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  backArrow: { ...FONTS.bold, fontSize: 22, color: COLORS.brand, marginTop: -2 },
  title:     { ...FONTS.xbold, fontSize: 22, color: COLORS.text },
  subtitle:  { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  bulkRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  bulkBtn: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.lg,
    borderWidth: 1, alignItems: 'center',
  },
  bulkText: { ...FONTS.bold, fontSize: 13 },

  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: 14, marginBottom: 10, ...SHADOW.sm,
  },
  statusDot:   { width: 10, height: 10, borderRadius: 5 },
  studentName: { ...FONTS.bold, fontSize: 14, color: COLORS.text },
  admissionNo: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  badge:       { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full },
  badgeText:   { ...FONTS.bold, fontSize: 12 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon:  { fontSize: 40 },
  emptyTitle: { ...FONTS.bold, fontSize: 16, color: COLORS.textMuted },

  saveRow: { marginTop: 20 },
  saveBtn: {
    backgroundColor: COLORS.brand, borderRadius: RADIUS.lg,
    padding: 16, alignItems: 'center', ...SHADOW.md,
  },
  saveBtnText: { ...FONTS.bold, fontSize: 15, color: COLORS.white },
});
