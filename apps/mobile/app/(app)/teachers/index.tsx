import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getTeachers } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const DEPT_COLORS = [COLORS.brand, COLORS.gold, COLORS.green, '#8b5cf6', '#ec4899'];

export default function TeachersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => getTeachers(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const teachers: any[] = data?.teachers ?? data?.data ?? [];
  const filtered = teachers.filter((t: any) => {
    const q = search.toLowerCase();
    const name = `${t.first_name ?? t.firstName ?? ''} ${t.last_name ?? t.lastName ?? ''}`.toLowerCase();
    return !q || name.includes(q) || (t.designation ?? '').toLowerCase().includes(q) || (t.subject ?? '').toLowerCase().includes(q);
  });

  function renderItem({ item, index }: { item: any; index: number }) {
    const name = `${item.first_name ?? item.firstName ?? ''} ${item.last_name ?? item.lastName ?? ''}`.trim() || item.name || 'Teacher';
    const color = DEPT_COLORS[index % DEPT_COLORS.length];

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
            router.push(`/(app)/teachers/${item.id}`);
          }}
          activeOpacity={0.75}
        >
          <View style={styles.cardInner}>
            <View style={[styles.avatar, { backgroundColor: color + '33' }]}>
              <Text style={[styles.avatarText, { color }]}>{name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{name}</Text>
              {item.designation && (
                <Text style={styles.designation}>{item.designation}</Text>
              )}
              <View style={styles.metaRow}>
                {item.subject && (
                  <View style={styles.subjectChip}>
                    <Text style={styles.subjectText}>{item.subject}</Text>
                  </View>
                )}
                {item.employee_id && (
                  <Text style={styles.empId}>#{item.employee_id}</Text>
                )}
              </View>
            </View>
            <View style={styles.contactBox}>
              {item.phone && <Text style={styles.phone}>📱</Text>}
              {item.email && <Text style={styles.email}>✉️</Text>}
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
        <Text style={styles.title}>Teachers</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filtered.length}</Text>
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', delay: 60 }}
        style={styles.searchWrap}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, subject or designation..."
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
              <Text style={styles.emptyEmoji}>👩‍🏫</Text>
              <Text style={styles.emptyText}>No teachers found</Text>
            </MotiView>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
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
    backgroundColor: COLORS.gold + '33',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: { ...FONTS.bold, fontSize: 13, color: COLORS.gold },
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
  searchIcon:  { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, color: COLORS.text, fontSize: 15 },
  clearBtn:    { ...FONTS.medium, color: COLORS.textMuted, fontSize: 16, padding: 4 },
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
  cardInner:   { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText:   { ...FONTS.bold, fontSize: 18 },
  info:         { flex: 1 },
  name:         { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  designation:  { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  subjectChip: {
    backgroundColor: COLORS.brand + '22',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  subjectText: { ...FONTS.medium, fontSize: 11, color: COLORS.brand },
  empId:       { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  contactBox:  { flexDirection: 'row', gap: 6, paddingLeft: 8 },
  phone:       { fontSize: 18 },
  email:       { fontSize: 18 },
  empty:       { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
