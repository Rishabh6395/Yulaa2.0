import React from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getSuperAdminKpiConfig } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function KpiConfigScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['super-kpi-config'],
    queryFn: getSuperAdminKpiConfig,
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const kpis: any[] = data?.kpis ?? data?.config ?? data?.data ?? [];

  function renderItem({ item, index }: { item: any; index: number }) {
    return (
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: index * 50, damping: 18 }}
      >
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.kpiName}>{item.name ?? item.kpi_name ?? item.label ?? 'KPI'}</Text>
            {item.weight != null && (
              <View style={styles.weightBadge}>
                <Text style={styles.weightText}>Weight: {item.weight}</Text>
              </View>
            )}
          </View>
          {item.description ? (
            <Text style={styles.kpiDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          {item.min_score != null && item.max_score != null ? (
            <Text style={styles.kpiRange}>Range: {item.min_score} – {item.max_score}</Text>
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
        <Text style={styles.screenTitle}>KPI Config</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={kpis}
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
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyText}>No KPI entries configured</Text>
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
  screenTitle: { ...FONTS.bold, fontSize: 20, color: COLORS.text },
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
  kpiName:     { ...FONTS.bold, fontSize: 15, color: COLORS.text, flex: 1 },
  kpiDesc:     { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  kpiRange:    { ...FONTS.medium, fontSize: 12, color: COLORS.brand, marginTop: 6 },
  weightBadge: {
    backgroundColor: COLORS.brand + '22',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  weightText:  { ...FONTS.medium, fontSize: 12, color: COLORS.brand },
  emptyState:  { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
