import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, TextInput, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getLocationMasters } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const TYPES = ['all', 'country', 'state', 'city', 'district'];

export default function LocationMastersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['location-masters'],
    queryFn: getLocationMasters,
  });
  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const allItems: any[] = data?.locations ?? data?.data ?? (Array.isArray(data) ? data : []);
  const filtered = allItems.filter((item: any) => {
    const matchType = type === 'all' || item.type === type;
    const matchSearch = !search || (item.name ?? '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const typeEmoji = (t: string) => {
    if (t === 'country') return '🌍';
    if (t === 'state') return '🗺️';
    if (t === 'city') return '🏙️';
    if (t === 'district') return '📍';
    return '📌';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Location Masters</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', delay: 60 }} style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput style={styles.searchInput} placeholder="Search locations..." placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} />
      </MotiView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {TYPES.map(t => (
          <TouchableOpacity key={t} style={[styles.chip, type === t && styles.chipActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setType(t); }}>
            <Text style={[styles.chipText, type === t && { color: COLORS.white }]}>{t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 30, damping: 18 }}>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.emoji}>{typeEmoji(item.type)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationName}>{item.name ?? 'Location'}</Text>
                    {item.parent_name && <Text style={styles.meta}>↳ {item.parent_name}</Text>}
                    {item.code && <Text style={styles.meta}>Code: {item.code}</Text>}
                  </View>
                  {item.type && (
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{item.type}</Text>
                    </View>
                  )}
                </View>
              </View>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌍</Text>
              <Text style={styles.emptyText}>No locations found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.bg },
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:         { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle:  { ...FONTS.bold, fontSize: 20, color: COLORS.text },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.cardBorder, marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 12 },
  searchIcon:   { fontSize: 16, marginRight: 8 },
  searchInput:  { flex: 1, paddingVertical: 12, color: COLORS.text, fontSize: 15 },
  filtersRow:   { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip:         { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.cardBorder },
  chipActive:   { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText:     { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13 },
  list:         { padding: 20, paddingBottom: 40 },
  card:         { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 14, marginBottom: 8, ...SHADOW.sm },
  cardRow:      { flexDirection: 'row', alignItems: 'center' },
  emoji:        { fontSize: 22, marginRight: 12 },
  locationName: { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  meta:         { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  typeBadge:    { backgroundColor: COLORS.brand + '22', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText:{ ...FONTS.medium, fontSize: 11, color: COLORS.brand, textTransform: 'capitalize' },
  emptyState:   { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:   { fontSize: 48, marginBottom: 14 },
  emptyText:    { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
