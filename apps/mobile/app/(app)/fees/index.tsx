import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, ScrollView, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getFees, recordPayment } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { Badge } from '../../../src/components/ui/Badge';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const STATUS_FILTERS = ['all', 'pending', 'paid', 'overdue', 'partial'];

function formatCurrency(amt: any) {
  return `₹${Number(amt ?? 0).toLocaleString('en-IN')}`;
}
function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function FeesScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.primaryRole === 'admin' || user?.primaryRole === 'principal';
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');

  const queryParams = statusFilter !== 'all' ? `status=${statusFilter}` : undefined;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['fees', statusFilter],
    queryFn: () => getFees(queryParams),
  });

  const payMutation = useMutation({
    mutationFn: recordPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fees'] });
      setSelectedInvoice(null);
      setPayAmount('');
      Alert.alert('Success', 'Payment recorded successfully.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const invoices: any[] = data?.invoices ?? data?.fees ?? data?.data ?? [];

  // Summary
  const totalDue = invoices
    .filter((i: any) => ['pending', 'overdue', 'partial'].includes(i.status))
    .reduce((sum: number, i: any) => sum + Number(i.amount ?? i.total_amount ?? 0), 0);
  const totalCollected = invoices
    .filter((i: any) => i.status === 'paid')
    .reduce((sum: number, i: any) => sum + Number(i.amount ?? i.total_amount ?? 0), 0);

  async function handlePayment() {
    if (!payAmount || isNaN(Number(payAmount))) {
      Alert.alert('Validation', 'Enter a valid amount.');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    payMutation.mutate({
      invoice_id:     selectedInvoice.id,
      amount:         Number(payAmount),
      payment_method: payMethod,
    });
  }

  function renderItem({ item, index }: { item: any; index: number }) {
    const name = item.student_name ?? item.name ?? 'Student';
    const amount = item.amount ?? item.total_amount;
    const isOverdue = item.status === 'overdue' || (item.due_date && new Date(item.due_date) < new Date() && item.status !== 'paid');

    return (
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: index * 40, damping: 18 }}
      >
        <TouchableOpacity
          style={[styles.card, isOverdue && styles.cardOverdue]}
          onPress={() => {
            if (isAdmin && item.status !== 'paid') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedInvoice(item);
              setPayAmount(String(amount ?? ''));
            }
          }}
          activeOpacity={isAdmin && item.status !== 'paid' ? 0.75 : 1}
        >
          <View style={styles.cardTop}>
            <View style={styles.iconBox}>
              <Text style={styles.iconText}>💰</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.studentName}>{name}</Text>
              <Text style={styles.invoiceType}>{item.description ?? item.fee_type ?? 'Fee Invoice'}</Text>
            </View>
            <Badge status={item.status ?? 'pending'} />
          </View>
          <View style={styles.cardBottom}>
            <Text style={[
              styles.amount,
              { color: item.status === 'paid' ? COLORS.green : isOverdue ? COLORS.red : COLORS.amber },
            ]}>
              {formatCurrency(amount)}
            </Text>
            {item.due_date && (
              <Text style={[styles.dueDate, isOverdue && { color: COLORS.red }]}>
                {isOverdue ? '⚠ Overdue · ' : 'Due: '}{formatDate(item.due_date)}
              </Text>
            )}
          </View>
          {isAdmin && item.status !== 'paid' && (
            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>Tap to record payment →</Text>
            </View>
          )}
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
        <Text style={styles.title}>Fees</Text>
      </MotiView>

      {/* Summary cards */}
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 60, damping: 18 }}
        style={styles.summaryRow}
      >
        <LinearGradient colors={[COLORS.red + '22', COLORS.card]} style={[styles.summaryCard, { borderColor: COLORS.red + '44' }]}>
          <Text style={styles.summaryLabel}>Outstanding</Text>
          <Text style={[styles.summaryAmount, { color: COLORS.red }]}>{formatCurrency(totalDue)}</Text>
        </LinearGradient>
        <LinearGradient colors={[COLORS.green + '22', COLORS.card]} style={[styles.summaryCard, { borderColor: COLORS.green + '44' }]}>
          <Text style={styles.summaryLabel}>Collected</Text>
          <Text style={[styles.summaryAmount, { color: COLORS.green }]}>{formatCurrency(totalCollected)}</Text>
        </LinearGradient>
      </MotiView>

      {/* Status filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, statusFilter === s && styles.chipActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStatusFilter(s); }}
          >
            <Text style={[styles.chipText, statusFilter === s && { color: COLORS.white }]}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ padding: 20 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={invoices}
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
              <Text style={styles.emptyEmoji}>💳</Text>
              <Text style={styles.emptyText}>No fee records found</Text>
            </MotiView>
          }
        />
      )}

      {/* Record Payment Bottom Sheet */}
      <Modal
        visible={!!selectedInvoice}
        animationType="none"
        transparent
        onRequestClose={() => setSelectedInvoice(null)}
      >
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedInvoice(null)} />
          <AnimatePresence>
            {selectedInvoice && (
              <MotiView
                from={{ translateY: 500 }}
                animate={{ translateY: 0 }}
                exit={{ translateY: 500 }}
                transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                style={styles.sheet}
              >
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Record Payment</Text>
                <Text style={styles.sheetSub}>
                  {selectedInvoice?.student_name ?? 'Student'} · {selectedInvoice?.description ?? 'Invoice'}
                </Text>

                <Input
                  label="Amount (₹)"
                  required
                  placeholder="Enter amount"
                  value={payAmount}
                  onChangeText={setPayAmount}
                  keyboardType="numeric"
                />

                <Text style={styles.fieldLabel}>Payment Method</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                  {['cash', 'upi', 'bank_transfer', 'card', 'cheque'].map(method => (
                    <TouchableOpacity
                      key={method}
                      style={[styles.methodChip, payMethod === method && styles.methodChipActive]}
                      onPress={() => setPayMethod(method)}
                    >
                      <Text style={[styles.methodText, payMethod === method && { color: COLORS.white }]}>
                        {method.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Button
                  label="Record Payment"
                  onPress={handlePayment}
                  loading={payMutation.isPending}
                />
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setSelectedInvoice(null)}
                  style={{ marginTop: 8 }}
                />
              </MotiView>
            )}
          </AnimatePresence>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  title: { ...FONTS.bold, fontSize: 22, color: COLORS.text },

  summaryRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 12 },
  summaryCard: {
    flex: 1, borderRadius: RADIUS.xl, borderWidth: 1,
    padding: 16, ...SHADOW.sm,
  },
  summaryLabel:  { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
  summaryAmount: { ...FONTS.xbold, fontSize: 18 },

  filterRow: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
  chip: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText:   { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13, textTransform: 'capitalize' },

  list: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    marginBottom: 10, padding: 16, ...SHADOW.sm,
  },
  cardOverdue: { borderColor: COLORS.red + '44' },
  cardTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.amber + '22',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  iconText:    { fontSize: 20 },
  info:        { flex: 1 },
  studentName: { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  invoiceType: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  cardBottom:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount:      { ...FONTS.xbold, fontSize: 20 },
  dueDate:     { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  tapHint:     { marginTop: 10, borderTopWidth: 1, borderTopColor: COLORS.cardBorder, paddingTop: 8 },
  tapHintText: { ...FONTS.medium, fontSize: 12, color: COLORS.brand, textAlign: 'right' },

  empty:     { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:{ fontSize: 48, marginBottom: 14 },
  emptyText: { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.cardBorder,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle:  { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: 4 },
  sheetSub:    { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },
  fieldLabel:  { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
  methodChip: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  methodChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  methodText:       { ...FONTS.medium, color: COLORS.textMuted, fontSize: 12 },
});
