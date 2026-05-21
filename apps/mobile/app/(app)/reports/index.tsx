import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getReports } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const REPORT_TYPES = ['all', 'attendance', 'fees', 'admissions', 'performance', 'exam'];

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ReportsScreen() {
  const router = useRouter();
  const [typeFilter,  setTypeFilter]  = useState('all');
  const [refreshing,  setRefreshing]  = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', typeFilter],
    queryFn: () => getReports(typeFilter !== 'all' ? `type=${typeFilter}` : ''),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const reports: any[] = data?.reports ?? data?.data ?? [];

  function renderItem({ item, index }: { item: any; index: number }) {
    return (
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: index * 50, damping: 18 }}
      >
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconBox}>
              <Text style={styles.iconEmoji}>📄</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reportTitle}>{item.title ?? item.name ?? item.report_type ?? 'Report'}</Text>
              <Text style={styles.reportDate}>{formatDate(item.created_at ?? item.generated_at ?? item.date)}</Text>
            </View>
            {(item.type ?? item.report_type) && (
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{(item.type ?? item.report_type).replace(/_/g, ' ')}</Text>
              </View>
            )}
          </View>
          {item.description ? (
            <Text style={styles.reportDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
        </View>
      </MotiView>
    );
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
        <Text style={styles.screenTitle}>Reports</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', delay: 80 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {REPORT_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.filterChip, typeFilter === t && styles.filterChipActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTypeFilter(t); }}
            >
              <Text style={[styles.filterChipText, typeFilter === t && { color: COLORS.white }]}>
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />
          }
          ListEmptyComponent={
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 100, damping: 16 }}
              style={styles.emptyState}
            >
              <Text style={styles.emptyEmoji}>📈</Text>
              <Text style={styles.emptyText}>No reports available</Text>
            </MotiView>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  back:        { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  filtersRow:  { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  filterChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  filterChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  filterChipText:   { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13 },
  list:        { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 12,
    ...SHADOW.sm,
  },
  cardRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.brand + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconEmoji:    { fontSize: 22 },
  reportTitle:  { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  reportDate:   { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  reportDesc:   { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  typeBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeText:    { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, textTransform: 'capitalize' },
  emptyState:  { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
