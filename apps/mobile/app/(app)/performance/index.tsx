import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getPerformance } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function PerformanceScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ['performance'], queryFn: () => getPerformance() });

  const records: any[] = data?.performance ?? data?.records ?? data?.data ?? [];

  function scoreColor(score: number, max: number = 100) {
    const pct = (score / max) * 100;
    if (pct >= 75) return '#10b981';
    if (pct >= 50) return COLORS.amber ?? '#f59e0b';
    return '#ef4444';
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Performance</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const score = item.score ?? item.marks_obtained ?? item.total_score ?? 0;
            const max   = item.max_score ?? item.total_marks ?? 100;
            const color = scoreColor(score, max);
            const pct   = Math.round((score / max) * 100);
            return (
              <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{item.student_name ?? item.name ?? 'Student'}</Text>
                      {item.subject && <Text style={styles.subjectText}>{item.subject}</Text>}
                    </View>
                    <View style={[styles.scoreBadge, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.scoreText, { color }]}>{pct}%</Text>
                    </View>
                  </View>
                  <View style={styles.progressBar}>
                    <MotiView
                      from={{ width: '0%' }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ type: 'timing', duration: 800, delay: index * 50 }}
                      style={[styles.progressFill, { backgroundColor: color }]}
                    />
                  </View>
                  <Text style={styles.scoreDetail}>{score} / {max}</Text>
                </View>
              </MotiView>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyText}>No performance data available</Text>
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
  list:        { padding: 20, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  studentName: { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  subjectText: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  scoreBadge:  { borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  scoreText:   { ...FONTS.bold, fontSize: 16 },
  progressBar: { height: 6, backgroundColor: COLORS.surface, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill:{ height: '100%', borderRadius: 3 },
  scoreDetail: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  emptyState:  { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
