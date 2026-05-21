import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getSchools } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function SchoolsScreen() {
  const router = useRouter();
  const [search, setSearch]       = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({ queryKey: ['schools'], queryFn: getSchools });
  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const schools: any[] = data?.schools ?? data?.data ?? [];
  const filtered = schools.filter((s: any) => !search || (s.name ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>School Library</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', delay: 60 }} style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput style={styles.searchInput} placeholder="Search schools..." placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 40, damping: 18 }}>
              <TouchableOpacity style={styles.card} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/(app)/schools/${item.id}`); }} activeOpacity={0.75}>
                <View style={styles.cardRow}>
                  <View style={styles.schoolIcon}><Text style={{ fontSize: 26 }}>🏫</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.schoolName}>{item.name ?? item.school_name ?? 'School'}</Text>
                    {item.city && <Text style={styles.schoolCity}>📍 {item.city}{item.state ? `, ${item.state}` : ''}</Text>}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>
                {item.email && <Text style={styles.meta}>✉️ {item.email}</Text>}
                {item.phone && <Text style={styles.meta}>📞 {item.phone}</Text>}
              </TouchableOpacity>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏫</Text>
              <Text style={styles.emptyText}>No schools found</Text>
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
  searchWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.cardBorder, marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 12 },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, color: COLORS.text, fontSize: 15 },
  list:        { padding: 20, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  schoolIcon:  { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.brand + '22', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  schoolName:  { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  schoolCity:  { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  chevron:     { ...FONTS.bold, fontSize: 22, color: COLORS.textMuted },
  meta:        { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  emptyState:  { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
