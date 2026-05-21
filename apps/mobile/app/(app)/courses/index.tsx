import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getCourses, enrollCourse } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const FILTERS = ['all', 'published', 'draft'];

export default function CoursesScreen() {
  const { user } = useAuth();
  const router   = useRouter();
  const qc       = useQueryClient();
  const role     = user?.primaryRole ?? '';
  const [filter, setFilter]       = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['courses', filter],
    queryFn: () => getCourses(filter !== 'all' ? `status=${filter}` : undefined),
  });

  const enrollMutation = useMutation({
    mutationFn: (id: string) => enrollCourse(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  });

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const courses: any[] = data?.courses ?? data?.data ?? [];

  function renderItem({ item, index }: { item: any; index: number }) {
    return (
      <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
        <TouchableOpacity style={styles.card} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/(app)/courses/${item.id}`); }} activeOpacity={0.75}>
          <View style={styles.cardRow}>
            <View style={styles.courseIcon}>
              <Text style={{ fontSize: 24 }}>🎓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseTitle}>{item.title ?? item.name ?? 'Course'}</Text>
              {item.instructor_name && <Text style={styles.instructor}>by {item.instructor_name}</Text>}
            </View>
            {item.status && (
              <View style={[styles.badge, item.status === 'published' ? styles.badgeGreen : styles.badgeGray]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            )}
          </View>
          {item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
          <View style={styles.footer}>
            {item.duration && <Text style={styles.meta}>⏱ {item.duration}</Text>}
            {item.lesson_count != null && <Text style={styles.meta}>📚 {item.lesson_count} lessons</Text>}
            {['student', 'parent'].includes(role) && !item.enrolled && (
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); enrollMutation.mutate(item.id); }}
                style={styles.enrollBtn}
                activeOpacity={0.8}
              >
                <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.enrollGrad}>
                  <Text style={styles.enrollText}>Enroll</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Courses</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.chip, filter === f && styles.chipActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter(f); }}>
            <Text style={[styles.chipText, filter === f && { color: COLORS.white }]}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎓</Text>
              <Text style={styles.emptyText}>No courses found</Text>
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
  filtersRow:  { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip:        { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.cardBorder },
  chipActive:  { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText:    { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13 },
  list:        { padding: 20, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  courseIcon:  { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.brand + '22', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  courseTitle: { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  instructor:  { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  desc:        { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 10 },
  footer:      { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  meta:        { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted },
  badge:       { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeGreen:  { backgroundColor: '#10b98122' },
  badgeGray:   { backgroundColor: COLORS.surface },
  badgeText:   { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, textTransform: 'capitalize' },
  enrollBtn:   { borderRadius: RADIUS.md, overflow: 'hidden', marginLeft: 'auto' },
  enrollGrad:  { paddingHorizontal: 16, paddingVertical: 8 },
  enrollText:  { ...FONTS.bold, color: COLORS.white, fontSize: 13 },
  emptyState:  { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
