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
import { getAdmissionWorkflow } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function AdmissionWorkflowScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admission-workflow'],
    queryFn: getAdmissionWorkflow,
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const steps: any[] = data?.steps ?? data?.workflow ?? data?.data ?? [];

  function renderItem({ item, index }: { item: any; index: number }) {
    return (
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: index * 60, damping: 18 }}
      >
        <View style={styles.card}>
          <View style={styles.stepNumRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNum}>{item.step_number ?? item.order ?? index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepName}>{item.name ?? item.step_name ?? `Step ${index + 1}`}</Text>
              {item.role && <Text style={styles.stepRole}>{item.role.replace(/_/g, ' ')}</Text>}
            </View>
            {item.is_active != null && (
              <View style={[styles.activeBadge, item.is_active ? styles.activeOn : styles.activeOff]}>
                <Text style={styles.activeBadgeText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
              </View>
            )}
          </View>
          {item.description ? (
            <Text style={styles.stepDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          {item.checklist?.length > 0 && (
            <Text style={styles.checklistHint}>📋 {item.checklist.length} checklist item{item.checklist.length !== 1 ? 's' : ''}</Text>
          )}
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
        <Text style={styles.screenTitle}>Admission Workflow</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={steps}
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
              <Text style={styles.emptyEmoji}>🔀</Text>
              <Text style={styles.emptyText}>No workflow steps configured</Text>
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
  screenTitle: { ...FONTS.bold, fontSize: 18, color: COLORS.text },
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
  stepNumRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.brand + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNum:         { ...FONTS.bold, fontSize: 16, color: COLORS.brand },
  stepName:        { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  stepRole:        { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2, textTransform: 'capitalize' },
  stepDesc:        { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  checklistHint:   { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
  activeBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeOn:        { backgroundColor: COLORS.green + '22' },
  activeOff:       { backgroundColor: COLORS.surface },
  activeBadgeText: { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted },
  emptyState:      { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:      { fontSize: 48, marginBottom: 14 },
  emptyText:       { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
