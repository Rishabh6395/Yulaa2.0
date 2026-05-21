import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getSuperAdminUsers } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const ROLE_COLORS: Record<string, string> = {
  super_admin:  '#8b5cf6',
  school_admin: '#3b82f6',
  principal:    '#10b981',
  teacher:      '#f59e0b',
  student:      '#ec4899',
  parent:       '#06b6d4',
  hod:          '#6366f1',
  employee:     '#84cc16',
  vendor:       '#f97316',
  consultant:   '#14b8a6',
};

export default function UsersScreen() {
  const router     = useRouter();
  const [search,      setSearch]     = useState('');
  const [roleFilter,  setRoleFilter] = useState('all');
  const [refreshing,  setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['super-users', roleFilter],
    queryFn: () => getSuperAdminUsers(roleFilter !== 'all' ? `role=${roleFilter}` : undefined),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const allUsers: any[] = data?.users ?? data?.data ?? [];
  const filtered = allUsers.filter((u: any) => {
    const q = search.toLowerCase();
    return !q || (u.name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q);
  });

  const roles = ['all', 'super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent', 'hod', 'employee', 'vendor', 'consultant'];

  function renderItem({ item, index }: { item: any; index: number }) {
    const role = item.primary_role ?? item.primaryRole ?? item.role ?? '';
    const roleColor = ROLE_COLORS[role] ?? COLORS.textMuted;
    return (
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: index * 40, damping: 18 }}
      >
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.avatar, { backgroundColor: roleColor + '33' }]}>
              <Text style={[styles.avatarText, { color: roleColor }]}>
                {(item.name ?? 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{item.name ?? 'Unknown'}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{item.email ?? item.phone ?? ''}</Text>
            </View>
            {role ? (
              <View style={[styles.roleBadge, { backgroundColor: roleColor + '22' }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>
                  {role.replace(/_/g, ' ')}
                </Text>
              </View>
            ) : null}
          </View>
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
        <Text style={styles.screenTitle}>Users</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 60, damping: 18 }}
        style={styles.searchWrap}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </MotiView>

      <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', delay: 100 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {roles.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.filterChip, roleFilter === r && styles.filterChipActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRoleFilter(r); }}
            >
              <Text style={[styles.filterChipText, roleFilter === r && { color: COLORS.white }]}>
                {r === 'all' ? 'All' : r.replace(/_/g, ' ')}
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
          data={filtered}
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
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>No users found</Text>
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, color: COLORS.text, fontSize: 15 },
  filtersRow:  { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  filterChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  filterChipActive:  { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  filterChipText:    { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13, textTransform: 'capitalize' },
  list:        { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    marginBottom: 10,
    ...SHADOW.sm,
  },
  cardRow:   { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { ...FONTS.bold, fontSize: 17 },
  userName:   { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  userEmail:  { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  roleBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleText:   { ...FONTS.medium, fontSize: 12, textTransform: 'capitalize' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyText:  { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
