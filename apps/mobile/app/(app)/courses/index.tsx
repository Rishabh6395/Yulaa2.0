import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { getCourses } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const TYPE_FILTERS = ['all', 'recorded', 'live', 'hybrid'] as const;
type TypeFilter = typeof TYPE_FILTERS[number];

const TYPE_COLOR: Record<string, string> = {
  recorded: COLORS.brand,
  live:     COLORS.red,
  hybrid:   COLORS.amber,
};

export default function CoursesScreen() {
  const { user } = useAuth();
  const router   = useRouter();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [refreshing, setRefreshing]  = useState(false);

  const qs = typeFilter !== 'all' ? `type=${typeFilter}` : '';
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['courses', typeFilter],
    queryFn:  () => getCourses(qs),
  });
  const courses: any[] = data?.courses ?? [];

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  function go(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(app)/courses/${id}` as any);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />}
      >
        <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 18 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Courses</Text>
            <Text style={styles.subtitle}>{courses.length} available</Text>
          </View>
        </MotiView>

        {/* Type filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {TYPE_FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, typeFilter === f && styles.chipActive]}
              onPress={() => setTypeFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, typeFilter === f && styles.chipTextActive]}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <>{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</>
        ) : courses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No courses found</Text>
            <Text style={styles.emptySubtitle}>Try a different filter</Text>
          </View>
        ) : (
          courses.map((c: any, i: number) => {
            const totalLessons = c.modules?.reduce((s: number, m: any) => s + (m.lessons?.length ?? 0), 0) ?? 0;
            const enrolled = c.enrollments?.length ?? 0;
            const typeColor = TYPE_COLOR[c.type ?? 'recorded'] ?? COLORS.brand;
            return (
              <MotiView key={c.id} from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: i * 55, damping: 18 }}>
                <TouchableOpacity style={styles.card} onPress={() => go(c.id)} activeOpacity={0.8}>
                  <View style={styles.cardRow}>
                    <View style={[styles.typeTag, { backgroundColor: typeColor + '22' }]}>
                      <Text style={[styles.typeTagText, { color: typeColor }]}>
                        {(c.type ?? 'recorded').toUpperCase()}
                      </Text>
                    </View>
                    {c.is_free || c.isFree ? (
                      <View style={styles.freeTag}>
                        <Text style={styles.freeTagText}>FREE</Text>
                      </View>
                    ) : (
                      <Text style={styles.price}>₹{Number(c.price ?? 0).toLocaleString('en-IN')}</Text>
                    )}
                  </View>

                  <Text style={styles.courseTitle}>{c.title}</Text>
                  {c.description && (
                    <Text style={styles.courseDesc} numberOfLines={2}>{c.description}</Text>
                  )}

                  <View style={styles.courseMeta}>
                    <Text style={styles.metaItem}>
                      👤 {c.teacher
                        ? `${c.teacher.user.firstName} ${c.teacher.user.lastName}`
                        : (c.instructor_name ?? c.instructorName ?? 'External')}
                    </Text>
                    {totalLessons > 0 && <Text style={styles.metaItem}>📖 {totalLessons} lessons</Text>}
                    {enrolled > 0 && <Text style={styles.metaItem}>👥 {enrolled} enrolled</Text>}
                  </View>

                  <Text style={[styles.viewMore, { color: typeColor }]}>View Course →</Text>
                </TouchableOpacity>
              </MotiView>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 48 },

  header:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  backArrow: { ...FONTS.bold, fontSize: 22, color: COLORS.brand, marginTop: -2 },
  title:     { ...FONTS.xbold, fontSize: 22, color: COLORS.text },
  subtitle:  { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  filterScroll: { gap: 8, paddingBottom: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  chipActive:    { backgroundColor: COLORS.brand + '22', borderColor: COLORS.brand + '66' },
  chipText:      { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  chipTextActive:{ color: COLORS.brand },

  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: 16, marginBottom: 14, ...SHADOW.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  typeTag:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  typeTagText: { ...FONTS.bold, fontSize: 10, letterSpacing: 0.5 },
  freeTag:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, backgroundColor: COLORS.green + '22' },
  freeTagText: { ...FONTS.bold, fontSize: 10, color: COLORS.green, letterSpacing: 0.5 },
  price:       { ...FONTS.bold, fontSize: 14, color: COLORS.gold },

  courseTitle: { ...FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: 6 },
  courseDesc:  { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 10 },

  courseMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metaItem:   { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  viewMore:   { ...FONTS.bold, fontSize: 13 },

  empty:         { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon:     { fontSize: 44 },
  emptyTitle:    { ...FONTS.bold, fontSize: 16, color: COLORS.textMuted },
  emptySubtitle: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted + 'aa' },
});
