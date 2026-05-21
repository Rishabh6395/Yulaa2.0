import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getSchoolInventory } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function SchoolInventoryScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['school-inventory'], queryFn: () => getSchoolInventory() });
  const items: any[] = data?.inventory ?? data?.items ?? data?.data ?? [];
  const filtered = items.filter((i: any) => !search || (i.name ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>School Inventory</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', delay: 60 }} style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput style={styles.searchInput} placeholder="Search items..." placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const lowStock = item.quantity != null && item.min_quantity != null && item.quantity <= item.min_quantity;
            return (
              <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 40, damping: 18 }}>
                <View style={[styles.card, lowStock && styles.cardLow]}>
                  <View style={styles.cardRow}>
                    <Text style={styles.itemName}>{item.name ?? item.item_name ?? 'Item'}</Text>
                    <Text style={[styles.qty, lowStock && { color: '#ef4444' }]}>
                      {item.quantity ?? '—'} {item.unit ?? ''}
                    </Text>
                  </View>
                  {item.category && <Text style={styles.category}>{item.category}</Text>}
                  {lowStock && <Text style={styles.lowStockWarn}>⚠️ Low stock</Text>}
                </View>
              </MotiView>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyText}>No inventory items found</Text>
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
  list:         { padding: 20, paddingBottom: 40 },
  card:         { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 10, ...SHADOW.sm },
  cardLow:      { borderColor: '#ef444444' },
  cardRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  itemName:     { ...FONTS.bold, fontSize: 15, color: COLORS.text, flex: 1 },
  qty:          { ...FONTS.bold, fontSize: 16, color: COLORS.brand },
  category:     { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted },
  lowStockWarn: { ...FONTS.medium, fontSize: 12, color: '#ef4444', marginTop: 4 },
  emptyState:   { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:   { fontSize: 48, marginBottom: 14 },
  emptyText:    { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
