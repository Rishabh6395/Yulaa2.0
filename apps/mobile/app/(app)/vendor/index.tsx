import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Modal, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { getVendors, getVendorProducts, placeOrder, getMyOrders, rateVendor } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

type Tab = 'browse' | 'orders';

const ORDER_STATUS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: COLORS.amber + '22', text: COLORS.amber },
  confirmed: { bg: COLORS.brand + '22', text: COLORS.brand },
  shipped:   { bg: '#7c3aed22', text: '#7c3aed' },
  delivered: { bg: COLORS.green + '22', text: COLORS.green },
  cancelled: { bg: COLORS.surface,      text: COLORS.textMuted },
};

function StarRow({ value, onSelect }: { value: number; onSelect: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <TouchableOpacity key={s} onPress={() => onSelect(s)}>
          <Text style={{ fontSize: 28, color: s <= value ? COLORS.gold : COLORS.surface }}>{s <= value ? '★' : '☆'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function VendorScreen() {
  const { user } = useAuth();
  const router   = useRouter();
  const qc       = useQueryClient();
  const [tab, setTab] = useState<Tab>('browse');
  const [refreshing, setRefreshing] = useState(false);

  // Shopping cart modal
  const [cartVendor, setCartVendor] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [address, setAddress] = useState('');
  const [loadingProds, setLoadingProds] = useState(false);

  // Rating modal
  const [ratingModal, setRatingModal] = useState<{ vendorId: string; orderId: string } | null>(null);
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState('');

  const { data: vendorsData, isLoading: loadingV, refetch: refetchV } = useQuery({
    queryKey: ['vendors'],
    queryFn: getVendors,
    enabled: tab === 'browse',
  });
  const { data: ordersData, isLoading: loadingO, refetch: refetchO } = useQuery({
    queryKey: ['my-orders'],
    queryFn: getMyOrders,
    enabled: tab === 'orders',
  });

  const vendors: any[] = vendorsData?.vendors ?? [];
  const orders: any[]  = ordersData?.orders ?? [];

  const orderMut = useMutation({
    mutationFn: placeOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-orders'] });
      setCartVendor(null); setCart({}); setAddress('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Order Placed!', 'Your order has been placed successfully.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const rateMut = useMutation({
    mutationFn: rateVendor,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-orders'] }); setRatingModal(null); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const onRefresh = async () => { setRefreshing(true); await Promise.all([refetchV(), refetchO()]); setRefreshing(false); };

  async function openVendor(vendor: any) {
    setCartVendor(vendor); setCart({});
    setLoadingProds(true);
    try {
      const d = await getVendorProducts(vendor.id);
      setProducts(d.products ?? []);
    } catch { setProducts([]); }
    setLoadingProds(false);
  }

  function adjustCart(productId: string, delta: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart(prev => {
      const next = (prev[productId] ?? 0) + delta;
      if (next <= 0) { const { [productId]: _, ...rest } = prev; return rest; }
      return { ...prev, [productId]: next };
    });
  }

  function submitOrder() {
    const items = Object.entries(cart).map(([product_id, quantity]) => ({ product_id, quantity }));
    if (!items.length) return Alert.alert('Cart is empty', 'Add at least one product.');
    if (!address.trim()) return Alert.alert('Delivery address', 'Please enter a delivery address.');
    orderMut.mutate({ vendor_id: cartVendor.id, items, delivery_address: address });
  }

  const cartTotal = products.reduce((sum, p) => sum + (Number(p.price) * (cart[p.id] ?? 0)), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />}
      >
        <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 18 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Marketplace</Text>
            <Text style={styles.subtitle}>School-approved vendors</Text>
          </View>
        </MotiView>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['browse', 'orders'] as Tab[]).map(t => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)} activeOpacity={0.8}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'browse' ? '🛒 Browse' : '📦 My Orders'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Browse tab */}
        {tab === 'browse' && (
          loadingV ? <>{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</> :
          vendors.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyIcon}>🏪</Text><Text style={styles.emptyTitle}>No vendors available</Text></View>
          ) : vendors.map((v: any, i: number) => (
            <MotiView key={v.id} from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: i * 55, damping: 18 }}>
              <TouchableOpacity style={styles.card} onPress={() => openVendor(v)} activeOpacity={0.8}>
                <View style={styles.vendorHeader}>
                  <View style={styles.vendorIcon}>
                    <Text style={{ fontSize: 22 }}>🏪</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vendorName}>{v.company_name}</Text>
                    <Text style={styles.vendorContact}>{v.contact_name}</Text>
                  </View>
                  {v.avg_rating && <Text style={styles.rating}>⭐ {v.avg_rating}</Text>}
                </View>
                {v.category && <Text style={styles.category}>{v.category}</Text>}
                {v.description && <Text style={styles.vendorDesc} numberOfLines={2}>{v.description}</Text>}
                <Text style={[styles.shopLink, { color: COLORS.green }]}>
                  {v.product_count > 0 ? `${v.product_count} products → Shop` : 'View Vendor →'}
                </Text>
              </TouchableOpacity>
            </MotiView>
          ))
        )}

        {/* Orders tab */}
        {tab === 'orders' && (
          loadingO ? <>{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</> :
          orders.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyIcon}>📦</Text><Text style={styles.emptyTitle}>No orders yet</Text><Text style={styles.emptySubtitle}>Browse vendors and place your first order</Text></View>
          ) : orders.map((o: any, i: number) => {
            const ss = ORDER_STATUS[o.status] ?? ORDER_STATUS.pending;
            return (
              <MotiView key={o.id} from={{ opacity: 0, translateX: -12 }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: 'spring', delay: i * 55, damping: 18 }}>
                <View style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                      <Text style={[styles.statusText, { color: ss.text }]}>{o.status?.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.orderDate}>{new Date(o.created_at ?? o.createdAt).toLocaleDateString('en-IN')}</Text>
                  </View>
                  <Text style={styles.vendorName}>{o.vendor?.company_name ?? 'Vendor'}</Text>
                  {(o.items ?? []).map((item: any) => (
                    <Text key={item.id} style={styles.orderItem}>• {item.product?.name ?? 'Product'} × {item.quantity}</Text>
                  ))}
                  <Text style={styles.orderTotal}>Total: ₹{Number(o.total_amount ?? o.totalAmount ?? 0).toLocaleString('en-IN')}</Text>
                  {o.status === 'delivered' && !o.rating && (
                    <TouchableOpacity
                      style={[styles.rateBtn]}
                      onPress={() => { setStars(5); setReview(''); setRatingModal({ vendorId: o.vendor_id ?? o.vendorId, orderId: o.id }); }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ ...FONTS.bold, fontSize: 13, color: COLORS.gold }}>⭐ Rate Order</Text>
                    </TouchableOpacity>
                  )}
                  {o.rating && <Text style={styles.ratedText}>⭐ {o.rating}/5 rated</Text>}
                </View>
              </MotiView>
            );
          })
        )}
      </ScrollView>

      {/* Product / Cart Modal */}
      <Modal visible={!!cartVendor} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{cartVendor?.company_name}</Text>
              <TouchableOpacity onPress={() => { setCartVendor(null); setCart({}); }}>
                <Text style={{ ...FONTS.bold, fontSize: 18, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingProds ? (
              <ActivityIndicator color={COLORS.brand} style={{ marginVertical: 24 }} />
            ) : products.length === 0 ? (
              <Text style={{ ...FONTS.regular, color: COLORS.textMuted, textAlign: 'center', marginVertical: 24 }}>No products available</Text>
            ) : (
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                {products.map((p: any) => (
                  <View key={p.id} style={styles.productRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName}>{p.name}</Text>
                      <Text style={styles.productPrice}>₹{Number(p.price).toLocaleString('en-IN')} / {p.unit ?? 'unit'}</Text>
                    </View>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustCart(p.id, -1)}>
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyVal}>{cart[p.id] ?? 0}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustCart(p.id, 1)}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <TextInput
              style={styles.addressInput}
              placeholder="Delivery address"
              placeholderTextColor={COLORS.textMuted}
              value={address}
              onChangeText={setAddress}
            />

            {cartTotal > 0 && (
              <Text style={styles.cartTotal}>Total: ₹{cartTotal.toLocaleString('en-IN')}</Text>
            )}

            <TouchableOpacity
              style={[styles.orderBtn, (orderMut.isPending || !Object.keys(cart).length) && { opacity: 0.5 }]}
              onPress={submitOrder}
              disabled={orderMut.isPending || !Object.keys(cart).length}
              activeOpacity={0.8}
            >
              {orderMut.isPending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.orderBtnText}>Place Order</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal visible={!!ratingModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate Your Order</Text>
            <StarRow value={stars} onSelect={setStars} />
            <TextInput
              style={styles.addressInput}
              placeholder="Write a review (optional)"
              placeholderTextColor={COLORS.textMuted}
              value={review}
              onChangeText={setReview}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.surface }]} onPress={() => setRatingModal(null)}>
                <Text style={{ ...FONTS.medium, color: COLORS.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: COLORS.brand, flex: 1 }]}
                onPress={() => rateMut.mutate({ vendor_id: ratingModal!.vendorId, order_id: ratingModal!.orderId, rating: stars, review })}
                disabled={rateMut.isPending}
              >
                {rateMut.isPending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={{ ...FONTS.bold, color: COLORS.white }}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 48 },

  header:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  backArrow: { ...FONTS.bold, fontSize: 22, color: COLORS.brand, marginTop: -2 },
  title:     { ...FONTS.xbold, fontSize: 22, color: COLORS.text },
  subtitle:  { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  tabRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder, alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: COLORS.brand + '22', borderColor: COLORS.brand + '66' },
  tabText:      { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.brand },

  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: 16, marginBottom: 14, ...SHADOW.sm,
  },
  cardTopRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  statusText:  { ...FONTS.bold, fontSize: 10 },
  orderDate:   { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },

  vendorHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  vendorIcon:   { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.green + '22', alignItems: 'center', justifyContent: 'center' },
  vendorName:   { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  vendorContact:{ ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rating:       { ...FONTS.bold, fontSize: 13, color: COLORS.gold },
  category:     { ...FONTS.medium, fontSize: 12, color: COLORS.brand, marginBottom: 4, textTransform: 'capitalize' },
  vendorDesc:   { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 8 },
  shopLink:     { ...FONTS.bold, fontSize: 13 },

  orderItem:  { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginBottom: 3 },
  orderTotal: { ...FONTS.bold, fontSize: 14, color: COLORS.text, marginTop: 8 },
  rateBtn:    { marginTop: 10 },
  ratedText:  { ...FONTS.regular, fontSize: 12, color: COLORS.gold, marginTop: 6 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon:     { fontSize: 44 },
  emptyTitle:    { ...FONTS.bold, fontSize: 16, color: COLORS.textMuted },
  emptySubtitle: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted + 'aa', textAlign: 'center' },

  modalBg:   { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: 24, ...SHADOW.lg,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:  { ...FONTS.bold, fontSize: 18, color: COLORS.text },

  productRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  productName:  { ...FONTS.bold, fontSize: 14, color: COLORS.text },
  productPrice: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  qtyRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn:    { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText:{ ...FONTS.bold, fontSize: 18, color: COLORS.brand },
  qtyVal:    { ...FONTS.bold, fontSize: 16, color: COLORS.text, minWidth: 24, textAlign: 'center' },

  addressInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.cardBorder,
    color: COLORS.text, padding: 13, fontSize: 14, ...FONTS.regular, marginTop: 16,
  },
  cartTotal: { ...FONTS.bold, fontSize: 15, color: COLORS.gold, marginTop: 10 },
  orderBtn: {
    backgroundColor: COLORS.brand, borderRadius: RADIUS.lg, padding: 15,
    alignItems: 'center', marginTop: 14, ...SHADOW.md,
  },
  orderBtnText: { ...FONTS.bold, fontSize: 15, color: COLORS.white },
  modalBtn: { paddingVertical: 13, paddingHorizontal: 20, borderRadius: RADIUS.lg, alignItems: 'center' },
});
