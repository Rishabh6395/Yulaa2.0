import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getBoardExamTracker, updateBoardExamTracker } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { useAuth } from '../../../src/context/AuthContext';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const STATUS_FILTERS = ['all', 'not_started', 'in_progress', 'completed'];
const STATUS_COLOR: Record<string, string> = {
  not_started: COLORS.textMuted,
  in_progress: '#f59e0b',
  completed:   '#10b981',
};
const STATUS_EMOJI: Record<string, string> = {
  not_started: '⬜',
  in_progress: '🔵',
  completed:   '✅',
};

function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export default function BoardExamTrackerScreen() {
  const router   = useRouter();
  const { user } = useAuth();
  const qc       = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing]     = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['board-exam-tracker', statusFilter],
    queryFn: () => getBoardExamTracker(statusFilter !== 'all' ? `status=${statusFilter}` : undefined),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => updateBoardExamTracker(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-exam-tracker'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const items: any[] = data?.trackers ?? data?.boardExams ?? data?.data ?? [];
  const filtered     = statusFilter === 'all' ? items : items.filter((i: any) => (i.status ?? 'not_started') === statusFilter);

  // Summary counts
  const total     = items.length;
  const completed = items.filter((i: any) => i.status === 'completed').length;
  const inProg    = items.filter((i: any) => i.status === 'in_progress').length;

  function cycleStatus(item: any) {
    const curr = item.status ?? 'not_started';
    const next = curr === 'not_started' ? 'in_progress' : curr === 'in_progress' ? 'completed' : 'not_started';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateMutation.mutate({ id: item.id, body: { status: next } });
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
        <Text style={styles.screenTitle}>Board Exam</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {/* Progress Summary */}
      {total > 0 && (
        <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', delay: 60, damping: 18 }} style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.sumStat}>
              <Text style={styles.sumValue}>{total}</Text>
              <Text style={styles.sumLabel}>Total</Text>
            </View>
            <View style={styles.sumStat}>
              <Text style={[styles.sumValue, { color: '#f59e0b' }]}>{inProg}</Text>
              <Text style={styles.sumLabel}>In Progress</Text>
            </View>
            <View style={styles.sumStat}>
              <Text style={[styles.sumValue, { color: '#10b981' }]}>{completed}</Text>
              <Text style={styles.sumLabel}>Completed</Text>
            </View>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${total > 0 ? (completed / total) * 100 : 0}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>{total > 0 ? Math.round((completed / total) * 100) : 0}% syllabus covered</Text>
        </MotiView>
      )}

      {/* Status Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {STATUS_FILTERS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, statusFilter === s && styles.chipActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStatusFilter(s); }}
          >
            <Text style={[styles.chipText, statusFilter === s && { color: COLORS.white }]}>
              {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          renderItem={({ item, index }) => {
            const status      = item.status ?? 'not_started';
            const statusColor = STATUS_COLOR[status] ?? COLORS.textMuted;
            const examDate    = item.examDate ?? item.exam_date;
            const days        = examDate ? daysUntil(examDate) : null;

            return (
              <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    {/* Status toggle button */}
                    <TouchableOpacity onPress={() => cycleStatus(item)} style={styles.statusBtn}>
                      <Text style={{ fontSize: 24 }}>{STATUS_EMOJI[status]}</Text>
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjectName}>{item.subject ?? item.subjectName ?? item.topic ?? 'Subject'}</Text>
                      {item.chapter && <Text style={styles.chapter}>{item.chapter}</Text>}
                      {(item.class?.name ?? item.className) && (
                        <Text style={styles.classMeta}>🎒 {item.class?.name ?? item.className}</Text>
                      )}
                    </View>

                    <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
                      <Text style={[styles.badgeText, { color: statusColor }]}>
                        {status.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>

                  {examDate && (
                    <View style={styles.examDateRow}>
                      <Text style={styles.examDateLabel}>Exam:</Text>
                      <Text style={[styles.examDateText, days !== null && days <= 7 && days >= 0 && { color: '#ef4444' }]}>
                        {fmtDate(examDate)}
                        {days !== null && days >= 0 && days <= 30
                          ? ` (${days === 0 ? 'Today!' : `in ${days}d`})`
                          : ''}
                      </Text>
                    </View>
                  )}

                  {item.notes && <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>}

                  <Text style={styles.tapHint}>Tap ⬜ to update status</Text>
                </View>
              </MotiView>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎓</Text>
              <Text style={styles.emptyTitle}>No Board Exam Items</Text>
              <Text style={styles.emptySubtitle}>Board exam tracker items will appear here once configured by the admin.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.bg },
  topBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:          { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle:   { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  summaryCard:   { marginHorizontal: 20, backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  summaryRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sumStat:       { alignItems: 'center', flex: 1 },
  sumValue:      { ...FONTS.xbold, fontSize: 24, color: COLORS.text },
  sumLabel:      { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  progressBg:    { height: 8, backgroundColor: COLORS.surface, borderRadius: 4, marginBottom: 6 },
  progressFill:  { height: 8, backgroundColor: '#10b981', borderRadius: 4 },
  progressLabel: { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  filtersRow:    { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip:          { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.cardBorder },
  chipActive:    { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText:      { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13, textTransform: 'capitalize' },
  list:          { padding: 20, paddingBottom: 40 },
  card:          { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  statusBtn:     { paddingTop: 2 },
  subjectName:   { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  chapter:       { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  classMeta:     { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  badge:         { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:     { ...FONTS.bold, fontSize: 12, textTransform: 'capitalize' },
  examDateRow:   { flexDirection: 'row', gap: 6, marginBottom: 4 },
  examDateLabel: { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  examDateText:  { ...FONTS.medium, fontSize: 13, color: COLORS.text },
  notes:         { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginTop: 4 },
  tapHint:       { ...FONTS.regular, fontSize: 11, color: COLORS.cardBorder, textAlign: 'right', marginTop: 8 },
  emptyState:    { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyEmoji:    { fontSize: 48, marginBottom: 14 },
  emptyTitle:    { ...FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: 6 },
  emptySubtitle: { ...FONTS.regular, fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
