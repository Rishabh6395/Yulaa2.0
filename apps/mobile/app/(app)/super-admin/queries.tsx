import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getSuperAdminQueries } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const STATUSES = ['all', 'open', 'in_progress', 'resolved'];

export default function SuperAdminQueriesScreen() {
  const router = useRouter();
  const [status, setStatus] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['super-queries', status],
    queryFn: () => getSuperAdminQueries(status !== 'all' ? `status=${status}` : undefined),
  });
  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const queries: any[] = data?.queries ?? data?.data ?? (Array.isArray(data) ? data : []);

  const badgeStyle = (s: string) => {
    if (s === 'resolved') return styles.badgeResolved;
    if (s === 'in_progress') return styles.badgeProgress;
    return styles.badgeOpen;
  };

  const priorityColor = (p: string) => {
    if (p === 'high') return '#ef4444';
    if (p === 'medium') return '#f59e0b';
    return COLORS.textMuted;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>School Admin Queries</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {STATUSES.map(s => (
          <TouchableOpacity key={s} style={[styles.chip, status === s && styles.chipActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStatus(s); }}>
            <Text style={[styles.chipText, status === s && { color: COLORS.white }]}>{s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={queries}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 40, damping: 18 }}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.subject}>{item.subject ?? item.title ?? 'Query'}</Text>
                  {item.status && (
                    <View style={[styles.badge, badgeStyle(item.status)]}>
                      <Text style={styles.badgeText}>{item.status.replace('_', ' ')}</Text>
                    </View>
                  )}
                </View>
                {item.school_name && <Text style={styles.meta}>🏫 {item.school_name}</Text>}
                {item.message && <Text style={styles.message} numberOfLines={2}>{item.message}</Text>}
                <View style={styles.cardFooter}>
                  {item.priority && <Text style={[styles.priority, { color: priorityColor(item.priority) }]}>● {item.priority} priority</Text>}
                  {item.created_at && <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>}
                </View>
              </View>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyText}>No queries found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.bg },
  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:           { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle:    { ...FONTS.bold, fontSize: 18, color: COLORS.text },
  filtersRow:     { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip:           { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.cardBorder },
  chipActive:     { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText:       { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13 },
  list:           { padding: 20, paddingBottom: 40 },
  card:           { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 14, marginBottom: 10, ...SHADOW.sm },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  subject:        { ...FONTS.bold, fontSize: 15, color: COLORS.text, flex: 1, marginRight: 8 },
  meta:           { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  message:        { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 4, lineHeight: 18 },
  cardFooter:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  priority:       { ...FONTS.medium, fontSize: 12, textTransform: 'capitalize' },
  date:           { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  badge:          { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeResolved:  { backgroundColor: '#10b98122' },
  badgeProgress:  { backgroundColor: '#3b82f622' },
  badgeOpen:      { backgroundColor: '#f59e0b22' },
  badgeText:      { ...FONTS.medium, fontSize: 11, color: COLORS.textMuted, textTransform: 'capitalize' },
  emptyState:     { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:     { fontSize: 48, marginBottom: 14 },
  emptyText:      { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
