import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, TextInput, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getStudents, getClasses } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { Badge } from '../../../src/components/ui/Badge';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function StudentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: getClasses,
  });

  const queryParams = [
    classFilter !== 'all' ? `class_id=${classFilter}` : '',
    search.trim() ? `search=${encodeURIComponent(search.trim())}` : '',
  ].filter(Boolean).join('&');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['students', classFilter, search],
    queryFn: () => getStudents(queryParams || undefined),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const students: any[] = data?.students ?? data?.data ?? [];
  const classes: any[] = classesData?.classes ?? classesData?.data ?? [];

  function renderItem({ item, index }: { item: any; index: number }) {
    const name = `${item.first_name ?? item.firstName ?? ''} ${item.last_name ?? item.lastName ?? ''}`.trim()
      || item.name || 'Student';
    const classLabel = item.class_name ?? item.className ?? item.grade ?? '';
    const admNo = item.admission_no ?? item.admissionNo ?? '';

    return (
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: index * 40, damping: 18 }}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/(app)/students/${item.id}`);
          }}
          activeOpacity={0.75}
        >
          <View style={styles.cardInner}>
            <LinearGradient
              colors={[COLORS.brand + '33', COLORS.brandDark + '22']}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={styles.info}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.meta}>
                {[classLabel, admNo ? `#${admNo}` : ''].filter(Boolean).join(' · ')}
              </Text>
              {item.parent_name && (
                <Text style={styles.parent}>Parent: {item.parent_name}</Text>
              )}
            </View>
            <View style={styles.chevronBox}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </View>
        </TouchableOpacity>
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
        <Text style={styles.title}>Students</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{students.length}</Text>
        </View>
      </MotiView>

      {/* Search */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', delay: 60 }}
        style={styles.searchWrap}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or admission no..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </MotiView>

      {/* Class filter */}
      {classes.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.chip, classFilter === 'all' && styles.chipActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setClassFilter('all'); }}
          >
            <Text style={[styles.chipText, classFilter === 'all' && { color: COLORS.white }]}>All</Text>
          </TouchableOpacity>
          {classes.map((cls: any) => (
            <TouchableOpacity
              key={cls.id}
              style={[styles.chip, classFilter === cls.id && styles.chipActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setClassFilter(cls.id); }}
            >
              <Text style={[styles.chipText, classFilter === cls.id && { color: COLORS.white }]}>
                {cls.name ?? cls.grade ?? cls.class_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        <View style={{ padding: 20 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.brand}
              colors={[COLORS.brand]}
            />
          }
          ListEmptyComponent={
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 100 }}
              style={styles.empty}
            >
              <Text style={styles.emptyEmoji}>🎓</Text>
              <Text style={styles.emptyText}>No students found</Text>
            </MotiView>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  title: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  countBadge: {
    backgroundColor: COLORS.brand + '33',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: { ...FONTS.bold, fontSize: 13, color: COLORS.brand },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  searchIcon:  { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, color: COLORS.text, fontSize: 15 },
  clearBtn:    { ...FONTS.medium, color: COLORS.textMuted, fontSize: 16, padding: 4 },
  filterRow:   { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText:   { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13 },
  list: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 10,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { ...FONTS.bold, fontSize: 18, color: COLORS.brand },
  info:       { flex: 1 },
  name:       { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  meta:       { ...FONTS.regular, fontSize: 13, color: COLORS.brand, marginTop: 2 },
  parent:     { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  chevronBox: { paddingLeft: 8 },
  chevron:    { ...FONTS.bold, fontSize: 22, color: COLORS.textMuted },
  empty:      { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyText:  { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
