import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getExamSchedule, getExamResults } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ExamScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'schedule' | 'results'>('schedule');

  const { data: scheduleData, isLoading: schedLoading } = useQuery({ queryKey: ['exam-schedule'], queryFn: getExamSchedule });
  const { data: resultsData,  isLoading: resLoading  } = useQuery({ queryKey: ['exam-results'],  queryFn: () => getExamResults() });

  const schedule: any[] = scheduleData?.datesheet ?? scheduleData?.exams ?? scheduleData?.data ?? [];
  const results: any[]  = resultsData?.results ?? resultsData?.data ?? [];
  const items = tab === 'schedule' ? schedule : results;
  const isLoading = tab === 'schedule' ? schedLoading : resLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Exams</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      <View style={styles.tabs}>
        {(['schedule', 'results'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t); }}>
            <Text style={[styles.tabText, tab === t && { color: COLORS.brand }]}>
              {t === 'schedule' ? '📅 Schedule' : '📊 Results'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.examName}>{item.subject ?? item.exam_name ?? item.name ?? 'Exam'}</Text>
                    {tab === 'schedule' && item.exam_date && <Text style={styles.examDate}>{formatDate(item.exam_date)}</Text>}
                    {tab === 'results' && item.marks_obtained != null && (
                      <Text style={styles.marks}>{item.marks_obtained} / {item.total_marks ?? '—'}</Text>
                    )}
                  </View>
                  {tab === 'schedule' && item.start_time && (
                    <Text style={styles.time}>{item.start_time}</Text>
                  )}
                  {tab === 'results' && item.grade && (
                    <View style={styles.gradeBadge}>
                      <Text style={styles.gradeText}>{item.grade}</Text>
                    </View>
                  )}
                </View>
                {item.venue && <Text style={styles.meta}>📍 {item.venue}</Text>}
              </View>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={styles.emptyText}>No {tab === 'schedule' ? 'exams scheduled' : 'results available'}</Text>
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
  tabs:        { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 4 },
  tabBtn:      { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.md },
  tabActive:   { backgroundColor: COLORS.card },
  tabText:     { ...FONTS.medium, fontSize: 14, color: COLORS.textMuted },
  list:        { padding: 20, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  examName:    { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  examDate:    { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  marks:       { ...FONTS.medium, fontSize: 13, color: COLORS.brand, marginTop: 2 },
  time:        { ...FONTS.medium, fontSize: 14, color: COLORS.brand },
  meta:        { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  gradeBadge:  { backgroundColor: COLORS.brand + '22', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  gradeText:   { ...FONTS.bold, fontSize: 16, color: COLORS.brand },
  emptyState:  { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
