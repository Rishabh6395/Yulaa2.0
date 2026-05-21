import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getVendors, getMyOrders, getVendorManage, getVendorProductList, getVendorOrders, getVendorRatings } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function VendorScreen() {
  const { user } = useAuth();
  const router   = useRouter();
  const role     = user?.primaryRole ?? '';
  const isVendor = role === 'vendor';

  const [tab, setTab] = useState<'browse' | 'orders' | 'products' | 'ratings'>(isVendor ? 'products' : 'browse');

  const tabs = isVendor
    ? [{ key: 'products', label: '🏷️ Products' }, { key: 'orders', label: '📦 Orders' }, { key: 'ratings', label: '⭐ Ratings' }]
    : [{ key: 'browse', label: '🛍️ Browse' }, { key: 'orders', label: '📦 My Orders' }];

  const { data: browseData,   isLoading: browseLoading   } = useQuery({ queryKey: ['vendors'],          queryFn: () => getVendors(),          enabled: tab === 'browse' });
  const { data: ordersData,   isLoading: ordersLoading   } = useQuery({ queryKey: ['vendor-orders'],    queryFn: () => isVendor ? getVendorOrders() : getMyOrders(), enabled: tab === 'orders' });
  const { data: productsData, isLoading: productsLoading } = useQuery({ queryKey: ['vendor-products'],  queryFn: () => getVendorProductList(), enabled: tab === 'products' });
  const { data: ratingsData,  isLoading: ratingsLoading  } = useQuery({ queryKey: ['vendor-ratings'],   queryFn: getVendorRatings,             enabled: tab === 'ratings' });

  const itemMap: Record<string, any[]> = {
    browse:   browseData?.vendors   ?? browseData?.data   ?? [],
    orders:   ordersData?.orders    ?? ordersData?.data   ?? [],
    products: productsData?.products ?? productsData?.data ?? [],
    ratings:  ratingsData?.ratings  ?? ratingsData?.data  ?? [],
  };
  const loadingMap: Record<string, boolean> = { browse: browseLoading, orders: ordersLoading, products: productsLoading, ratings: ratingsLoading };

  const items = itemMap[tab] ?? [];
  const isLoading = loadingMap[tab] ?? false;

  function renderItem({ item, index }: { item: any; index: number }) {
    return (
      <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 40, damping: 18 }}>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconBox}><Text style={{ fontSize: 24 }}>🛍️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.name ?? item.title ?? item.product_name ?? item.vendor_name ?? 'Item'}</Text>
              {item.price != null && <Text style={styles.price}>₹{item.price.toLocaleString('en-IN')}</Text>}
              {item.rating != null && <Text style={styles.rating}>⭐ {item.rating}</Text>}
              {item.status && <Text style={styles.status}>{item.status.replace(/_/g, ' ')}</Text>}
            </View>
          </View>
          {item.description && <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>}
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
        <Text style={styles.screenTitle}>{isVendor ? 'My Store' : 'Marketplace'}</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      <View style={styles.tabRow}>
        {tabs.map(t => (
          <TouchableOpacity key={t.key} style={[styles.tabBtn, tab === t.key && styles.tabActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t.key as any); }}>
            <Text style={[styles.tabText, tab === t.key && { color: COLORS.brand }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🛒</Text>
              <Text style={styles.emptyText}>Nothing here yet</Text>
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
  tabRow:      { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 4, gap: 2 },
  tabBtn:      { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.md },
  tabActive:   { backgroundColor: COLORS.card },
  tabText:     { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  list:        { padding: 20, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 14, marginBottom: 10, ...SHADOW.sm },
  cardRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox:     { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.brand + '22', alignItems: 'center', justifyContent: 'center' },
  itemTitle:   { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  price:       { ...FONTS.bold, fontSize: 14, color: COLORS.brand, marginTop: 2 },
  rating:      { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  status:      { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, marginTop: 2, textTransform: 'capitalize' },
  desc:        { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 6 },
  emptyState:  { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
