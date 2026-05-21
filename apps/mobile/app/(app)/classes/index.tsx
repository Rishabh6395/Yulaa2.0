import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getClasses } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function ClassesScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({ queryKey: ['classes'], queryFn: getClasses });

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const classes: any[] = data?.classes ?? data?.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Classes</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item, i) => item.id ?? String(i)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', delay: index * 50, damping: 16 }} style={{ flex: 1 }}>
              <View style={styles.card}>
                <Text style={styles.className}>{item.name ?? item.class_name ?? `Class ${index + 1}`}</Text>
                {item.section && <Text style={styles.section}>Section {item.section}</Text>}
                <View style={styles.statsRow}>
                  {item.student_count != null && <Text style={styles.stat}>👥 {item.student_count}</Text>}
                  {item.teacher_name && <Text style={styles.stat} numberOfLines={1}>👩‍🏫 {item.teacher_name}</Text>}
                </View>
              </View>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎒</Text>
              <Text style={styles.emptyText}>No classes found</Text>
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
  grid:        { padding: 20, paddingBottom: 40, gap: 12 },
  card:        { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, ...SHADOW.sm },
  className:   { ...FONTS.bold, fontSize: 18, color: COLORS.text },
  section:     { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  statsRow:    { marginTop: 10, gap: 4 },
  stat:        { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted },
  emptyState:  { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
