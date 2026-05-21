import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getTimetable } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableScreen() {
  const router = useRouter();
  const today = DAYS[new Date().getDay() - 1] ?? 'Monday';
  const [day, setDay] = useState(today);

  const { data, isLoading } = useQuery({
    queryKey: ['timetable'],
    queryFn: () => getTimetable(),
  });

  const all: any[] = data?.timetable ?? data?.periods ?? data?.data ?? [];
  const periods = all.filter((p: any) => (p.day ?? '').toLowerCase() === day.toLowerCase());

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Timetable</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
        {DAYS.map(d => (
          <TouchableOpacity key={d} style={[styles.dayChip, day === d && styles.dayChipActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDay(d); }}>
            <Text style={[styles.dayText, day === d && { color: COLORS.white }]}>{d.slice(0, 3)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={periods}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateX: -16 }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
              <View style={styles.period}>
                <View style={styles.timeCol}>
                  <Text style={styles.timeText}>{item.start_time ?? item.from ?? '—'}</Text>
                  <View style={styles.timeLine} />
                  <Text style={styles.timeText}>{item.end_time ?? item.to ?? ''}</Text>
                </View>
                <View style={styles.periodCard}>
                  <Text style={styles.subjectName}>{item.subject ?? item.subject_name ?? 'Period'}</Text>
                  {item.teacher_name && <Text style={styles.teacherName}>{item.teacher_name}</Text>}
                  {item.room && <Text style={styles.roomText}>Room {item.room}</Text>}
                </View>
              </View>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🗓️</Text>
              <Text style={styles.emptyText}>No periods for {day}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.bg },
  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:        { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  dayRow:      { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  dayChip:     { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.cardBorder },
  dayChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  dayText:     { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  list:        { padding: 20, paddingBottom: 40 },
  period:      { flexDirection: 'row', marginBottom: 16, alignItems: 'stretch' },
  timeCol:     { width: 60, alignItems: 'center', marginRight: 14 },
  timeText:    { ...FONTS.medium, fontSize: 11, color: COLORS.textMuted },
  timeLine:    { flex: 1, width: 2, backgroundColor: COLORS.brand + '44', marginVertical: 4 },
  periodCard:  { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 14, ...SHADOW.sm },
  subjectName: { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  teacherName: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  roomText:    { ...FONTS.medium, fontSize: 12, color: COLORS.brand, marginTop: 4 },
  emptyState:  { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
