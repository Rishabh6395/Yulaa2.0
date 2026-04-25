import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  getLeaves, submitLeave, reviewLeave,
  getLeaveBalance, getLeaveTypes,
} from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { AnimatedCard } from '../../../src/components/ui/AnimatedCard';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function LeaveScreen() {
  const { user }  = useAuth();
  const qc        = useQueryClient();
  const isAdmin   = user?.primaryRole === 'admin' || user?.primaryRole === 'principal';
  const [refreshing, setRefreshing] = useState(false);
  const [showApply, setShowApply]   = useState(false);

  // Form state
  const [leaveType,  setLeaveType]  = useState('');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [reason,     setReason]     = useState('');

  const { data: leavesData, isLoading, refetch } = useQuery({
    queryKey: ['leaves'],
    queryFn: getLeaves,
  });

  const { data: balanceData } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: getLeaveBalance,
    enabled: !isAdmin,
  });

  const { data: typesData } = useQuery({
    queryKey: ['leave-types'],
    queryFn: getLeaveTypes,
  });

  const submitMutation = useMutation({
    mutationFn: submitLeave,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] });
      setShowApply(false);
      setLeaveType(''); setStartDate(''); setEndDate(''); setReason('');
      Alert.alert('Success', 'Leave application submitted.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => reviewLeave(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const leaves: any[] = leavesData?.leaves ?? [];
  // API may return an array [{leave_type, total_days, used_days, remaining}]
  // or an object {casual: 5, sick: 3, ...}
  const balanceRaw: any = balanceData ?? {};
  const balanceItems: Array<{ label: string; value: number | string }> = Array.isArray(balanceRaw)
    ? balanceRaw.map((b: any) => ({ label: b.leave_type ?? b.type, value: b.remaining ?? b.remaining_days ?? 0 }))
    : Object.entries(balanceRaw).map(([k, v]) => ({ label: k, value: v as any }));
  const balance: any = balanceRaw;
  const leaveTypes: any[] = typesData?.types ?? typesData?.leaveTypes ?? [
    { code: 'casual',   label: 'Casual Leave' },
    { code: 'sick',     label: 'Sick Leave' },
    { code: 'earned',   label: 'Earned Leave' },
    { code: 'maternity',label: 'Maternity Leave' },
  ];

  async function handleApply() {
    if (!leaveType || !startDate || !endDate || !reason.trim()) {
      Alert.alert('Validation', 'Please fill all fields.');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    submitMutation.mutate({ leave_type: leaveType, start_date: startDate, end_date: endDate, reason });
  }

  async function handleReview(id: string, action: string) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    reviewMutation.mutate({ id, action });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />
        }
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 0, damping: 18 }}
          style={styles.header}
        >
          <Text style={styles.screenTitle}>Leave</Text>
          {!isAdmin && (
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowApply(true); }}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.applyBtnGrad}>
                <Text style={styles.applyBtnText}>+ Apply Leave</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </MotiView>

        {/* Balance cards for teachers */}
        {!isAdmin && balanceItems.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 80, damping: 18 }}
            style={styles.balanceCard}
          >
            <Text style={styles.balanceTitle}>Leave Balance</Text>
            <View style={styles.balanceRow}>
              {balanceItems.slice(0, 4).map((item, i) => (
                <View key={i} style={styles.balanceItem}>
                  <Text style={styles.balanceVal}>{item.value}</Text>
                  <Text style={styles.balanceKey}>{String(item.label).replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </MotiView>
        )}

        {/* Leave list */}
        <Text style={styles.sectionTitle}>
          {isAdmin ? 'Pending Applications' : 'My Applications'}
        </Text>

        {isLoading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : leaves.length === 0 ? (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 120, damping: 16 }}
            style={styles.emptyState}
          >
            <Text style={styles.emptyEmoji}>🗓️</Text>
            <Text style={styles.emptyText}>No leave applications</Text>
          </MotiView>
        ) : (
          leaves.map((lv: any, i: number) => (
            <AnimatedCard key={lv.id ?? i} delay={100} index={i}>
              <View style={styles.leaveRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.leaveTopRow}>
                    <Text style={styles.leaveName}>{lv.applicant_name ?? lv.teacher_name ?? lv.name ?? 'Applicant'}</Text>
                    <Badge status={lv.status ?? 'pending'} />
                  </View>
                  <Text style={styles.leaveType}>{(lv.leave_type ?? lv.type ?? '').replace(/_/g, ' ')}</Text>
                  <Text style={styles.leaveDate}>
                    {formatDate(lv.start_date)} — {formatDate(lv.end_date)}
                  </Text>
                  {lv.reason && (
                    <Text style={styles.leaveReason} numberOfLines={2}>{lv.reason}</Text>
                  )}
                </View>
              </View>
              {isAdmin && (lv.status === 'pending' || lv.status === 'submitted') && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleReview(lv.id, 'approve')}
                  >
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleReview(lv.id, 'reject')}
                  >
                    <Text style={[styles.actionBtnText, { color: COLORS.red }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </AnimatedCard>
          ))
        )}
      </ScrollView>

      {/* Apply Leave Modal */}
      <Modal visible={showApply} animationType="none" transparent onRequestClose={() => setShowApply(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowApply(false)} />
          <AnimatePresence>
            {showApply && (
              <MotiView
                from={{ translateY: 600 }}
                animate={{ translateY: 0 }}
                exit={{ translateY: 600 }}
                transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                style={styles.bottomSheet}
              >
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Apply for Leave</Text>

                <Text style={styles.fieldLabel}>Leave Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  {leaveTypes.map((lt: any) => (
                    <TouchableOpacity
                      key={lt.code}
                      style={[styles.typeChip, leaveType === lt.code && styles.typeChipActive]}
                      onPress={() => setLeaveType(lt.code)}
                    >
                      <Text style={[styles.typeChipText, leaveType === lt.code && { color: COLORS.white }]}>
                        {lt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Input
                  label="Start Date"
                  required
                  placeholder="YYYY-MM-DD"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholderTextColor={COLORS.textMuted}
                />
                <Input
                  label="End Date"
                  required
                  placeholder="YYYY-MM-DD"
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholderTextColor={COLORS.textMuted}
                />
                <Input
                  label="Reason"
                  required
                  placeholder="Describe the reason..."
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 80 }}
                />

                <Button
                  label="Submit Application"
                  onPress={handleApply}
                  loading={submitMutation.isPending}
                  style={{ marginTop: 8 }}
                />
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setShowApply(false)}
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
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  screenTitle: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  applyBtn:    { borderRadius: RADIUS.md, overflow: 'hidden' },
  applyBtnGrad:{ paddingHorizontal: 16, paddingVertical: 10 },
  applyBtnText:{ ...FONTS.bold, color: COLORS.white, fontSize: 14 },

  balanceCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 20,
    ...SHADOW.sm,
  },
  balanceTitle: { ...FONTS.bold, fontSize: 14, color: COLORS.text, marginBottom: 12 },
  balanceRow:   { flexDirection: 'row', justifyContent: 'space-around' },
  balanceItem:  { alignItems: 'center' },
  balanceVal:   { ...FONTS.xbold, fontSize: 22, color: COLORS.brand },
  balanceKey:   { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted, textTransform: 'capitalize', marginTop: 3 },

  sectionTitle: { ...FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: 14 },

  leaveRow:    { },
  leaveTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  leaveName:   { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  leaveType:   { ...FONTS.medium, fontSize: 13, color: COLORS.brand, textTransform: 'capitalize', marginBottom: 4 },
  leaveDate:   { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  leaveReason: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 6, lineHeight: 18 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  approveBtn: { backgroundColor: COLORS.green + '22', borderColor: COLORS.green + '55' },
  rejectBtn:  { backgroundColor: COLORS.red + '22',   borderColor: COLORS.red + '55' },
  actionBtnText: { ...FONTS.bold, color: COLORS.green, fontSize: 14 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyText:  { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  bottomSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.cardBorder,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: 20 },

  fieldLabel: { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
  typeChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  typeChipActive:  { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  typeChipText:    { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13 },
});
