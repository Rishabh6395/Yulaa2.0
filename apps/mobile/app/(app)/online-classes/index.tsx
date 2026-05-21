import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getOnlineClasses } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const FILTERS = ['all', 'upcoming', 'live', 'completed'];

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function OnlineClassesScreen() {
  const { user } = useAuth();
  const router   = useRouter();
  const role     = user?.primaryRole ?? '';
  const canCreate = ['school_admin', 'principal', 'teacher'].includes(role);

  const [filter, setFilter]       = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['online-classes', filter],
    queryFn: () => getOnlineClasses(filter !== 'all' ? `status=${filter}` : undefined),
  });

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const classes: any[] = data?.classes ?? data?.data ?? [];

  function renderItem({ item, index }: { item: any; index: number }) {
    const isLive = item.status === 'live';
    return (
      <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
        <View style={[styles.card, isLive && styles.cardLive]}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.classTitle}>{item.title ?? item.class_name ?? 'Class'}</Text>
              <Text style={styles.classSubject}>{item.subject ?? item.subject_name ?? ''}</Text>
            </View>
            <View style={[styles.statusBadge, isLive ? styles.liveBadge : styles.otherBadge]}>
              <Text style={[styles.statusText, isLive && { color: '#10b981' }]}>
                {isLive ? '🔴 LIVE' : (item.status ?? 'upcoming')}
              </Text>
            </View>
          </View>
          <Text style={styles.classMeta}>{formatDate(item.scheduled_at ?? item.start_time ?? item.date)}</Text>
          {item.teacher_name && <Text style={styles.classTeacher}>👩‍🏫 {item.teacher_name}</Text>}
          {item.meeting_link && (
            <TouchableOpacity style={styles.joinBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)} activeOpacity={0.8}>
              <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.joinGrad}>
                <Text style={styles.joinText}>Join Class</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
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
        <Text style={styles.screenTitle}>Online Classes</Text>
        {canCreate ? (
          <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/online-classes/create')} activeOpacity={0.8}>
            <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.fabGrad}>
              <Text style={styles.fabText}>+ New</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : <View style={{ width: 60 }} />}
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
          data={classes}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💻</Text>
              <Text style={styles.emptyText}>No online classes found</Text>
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
  screenTitle: { ...FONTS.bold, fontSize: 20, color: COLORS.text },
  fab:         { borderRadius: RADIUS.md, overflow: 'hidden' },
  fabGrad:     { paddingHorizontal: 16, paddingVertical: 10 },
  fabText:     { ...FONTS.bold, color: COLORS.white, fontSize: 14 },
  filtersRow:  { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip:        { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.cardBorder },
  chipActive:  { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText:    { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13 },
  list:        { padding: 20, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardLive:    { borderColor: '#10b98144' },
  cardRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  classTitle:  { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  classSubject:{ ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  classMeta:   { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  classTeacher:{ ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  statusBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  liveBadge:   { backgroundColor: '#10b98122' },
  otherBadge:  { backgroundColor: COLORS.surface },
  statusText:  { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, textTransform: 'capitalize' },
  joinBtn:     { marginTop: 12, borderRadius: RADIUS.md, overflow: 'hidden', alignSelf: 'flex-start' },
  joinGrad:    { paddingHorizontal: 20, paddingVertical: 10 },
  joinText:    { ...FONTS.bold, color: COLORS.white, fontSize: 14 },
  emptyState:  { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
