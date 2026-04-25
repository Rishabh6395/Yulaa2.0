import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getParents } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function ParentsScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['parents'],
    queryFn: () => getParents(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const parents: any[] = data?.parents ?? data?.data ?? [];
  const filtered = parents.filter((p: any) => {
    const q = search.toLowerCase();
    const name = `${p.first_name ?? p.firstName ?? ''} ${p.last_name ?? p.lastName ?? ''}`.toLowerCase();
    return !q || name.includes(q) || (p.phone ?? '').includes(q);
  });

  function renderItem({ item, index }: { item: any; index: number }) {
    const name = `${item.first_name ?? item.firstName ?? ''} ${item.last_name ?? item.lastName ?? ''}`.trim() || item.name || 'Parent';
    const children: any[] = item.students ?? item.children ?? [];

    return (
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: index * 40, damping: 18 }}
      >
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{name}</Text>
              {item.phone && <Text style={styles.phone}>📱 {item.phone}</Text>}
              {item.email && <Text style={styles.email}>✉️ {item.email}</Text>}
            </View>
          </View>
          {children.length > 0 && (
            <View style={styles.childrenRow}>
              <Text style={styles.childrenLabel}>Children: </Text>
              <View style={styles.chips}>
                {children.slice(0, 3).map((c: any, ci: number) => (
                  <View key={ci} style={styles.chip}>
                    <Text style={styles.chipText}>
                      {c.first_name ?? c.name ?? 'Student'}
                    </Text>
                  </View>
                ))}
                {children.length > 3 && (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>+{children.length - 3}</Text>
                  </View>
                )}
              </View>
            </View>
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
        <Text style={styles.title}>Parents</Text>
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
          placeholder="Search by name or phone..."
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
              <Text style={styles.emptyEmoji}>👨‍👩‍👧</Text>
              <Text style={styles.emptyText}>No parents found</Text>
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 12,
  },
  title: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  countBadge: {
    backgroundColor: COLORS.green + '33',
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3,
  },
  countText: { ...FONTS.bold, fontSize: 13, color: COLORS.green },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    marginHorizontal: 20, marginBottom: 10, paddingHorizontal: 12,
  },
  searchIcon:  { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, color: COLORS.text, fontSize: 15 },
  clearBtn:    { ...FONTS.medium, color: COLORS.textMuted, fontSize: 16, padding: 4 },
  list: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    marginBottom: 10, padding: 16, ...SHADOW.sm,
  },
  cardTop:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: COLORS.green + '33',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText:  { ...FONTS.bold, fontSize: 18, color: COLORS.green },
  info:        { flex: 1 },
  name:        { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  phone:       { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 3 },
  email:       { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  childrenRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  childrenLabel: { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  chip: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  chipText:  { ...FONTS.medium, fontSize: 12, color: COLORS.brand },
  empty:     { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:{ fontSize: 48, marginBottom: 14 },
  emptyText: { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
