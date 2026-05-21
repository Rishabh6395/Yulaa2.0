import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getMasterItems } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const MASTER_CATEGORIES = [
  { key: 'blood-groups',       label: 'Blood Groups',       emoji: '🩸' },
  { key: 'grades',             label: 'Grades',             emoji: '🏅' },
  { key: 'streams',            label: 'Streams',            emoji: '📚' },
  { key: 'subjects',           label: 'Subjects',           emoji: '📖' },
  { key: 'leave-types',        label: 'Leave Types',        emoji: '🗓️' },
  { key: 'exam-types',         label: 'Exam Types',         emoji: '📝' },
  { key: 'event-types',        label: 'Event Types',        emoji: '📅' },
  { key: 'announcement-types', label: 'Announcement Types', emoji: '📢' },
  { key: 'gender',             label: 'Gender',             emoji: '🧑' },
  { key: 'qualifications',     label: 'Qualifications',     emoji: '🎓' },
  { key: 'grading-types',      label: 'Grading Types',      emoji: '⭐' },
  { key: 'school-hierarchy',   label: 'School Hierarchy',   emoji: '🏫' },
  { key: 'school-location',    label: 'School Location',    emoji: '📍' },
  { key: 'countries',          label: 'Countries',          emoji: '🌍' },
  { key: 'states',             label: 'States',             emoji: '🗺️' },
  { key: 'districts',          label: 'Districts',          emoji: '🏙️' },
  { key: 'content-types',      label: 'Content Types',      emoji: '🗂️' },
];

export default function MastersScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['masters', selected],
    queryFn: () => (selected ? getMasterItems(selected) : Promise.resolve(null)),
    enabled: !!selected,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const items: any[] = data?.data ?? data?.items ?? data?.records ?? [];

  if (selected) {
    const cat = MASTER_CATEGORIES.find(c => c.key === selected);
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar style="light" />
        <MotiView
          from={{ opacity: 0, translateY: -16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 0, damping: 18 }}
          style={styles.topBar}
        >
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(null); }}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{cat?.label ?? selected}</Text>
          <View style={{ width: 60 }} />
        </MotiView>
        {isLoading ? (
          <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item, i) => item.id ?? item.slug ?? String(i)}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />
            }
            renderItem={({ item, index }) => (
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: index * 40, damping: 18 }}
              >
                <View style={styles.itemCard}>
                  <Text style={styles.itemName}>{item.name ?? item.label ?? item.value ?? JSON.stringify(item)}</Text>
                  {item.code && <Text style={styles.itemCode}>{item.code}</Text>}
                </View>
              </MotiView>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🗄️</Text>
                <Text style={styles.emptyText}>No records found</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
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
        <Text style={styles.screenTitle}>Masters</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      <FlatList
        data={MASTER_CATEGORIES}
        keyExtractor={item => item.key}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item, index }) => (
          <MotiView
            from={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: index * 40, damping: 16 }}
            style={{ flex: 1 }}
          >
            <TouchableOpacity
              style={styles.catCard}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(item.key); }}
              activeOpacity={0.75}
            >
              <Text style={styles.catEmoji}>{item.emoji}</Text>
              <Text style={styles.catLabel}>{item.label}</Text>
            </TouchableOpacity>
          </MotiView>
        )}
      />
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
  grid:        { padding: 20, paddingBottom: 40, gap: 12 },
  catCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 20,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  catEmoji: { fontSize: 30, marginBottom: 10 },
  catLabel: { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  list:     { padding: 20, paddingBottom: 40 },
  itemCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName:   { ...FONTS.medium, fontSize: 15, color: COLORS.text },
  itemCode:   { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyText:  { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
