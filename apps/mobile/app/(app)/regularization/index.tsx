import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, Modal, Alert, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView, AnimatePresence } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getRegularizations, submitRegularization, reviewRegularization } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { Button } from '../../../src/components/ui/Button';
import { useAuth } from '../../../src/context/AuthContext';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const STATUSES = ['all', 'pending', 'approved', 'rejected'];
const STATUS_COLOR: Record<string, string> = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };
const TO_STATUS_LABELS = ['present', 'absent', 'late', 'half_day', 'excused'];

function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function RegularizationScreen() {
  const router   = useRouter();
  const { user } = useAuth();
  const qc       = useQueryClient();
  const isAdmin  = ['school_admin', 'principal', 'hod'].includes(user?.primaryRole ?? '');

  const [status, setStatus]             = useState('all');
  const [refreshing, setRefreshing]     = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [showReview, setShowReview]     = useState<any>(null);

  // Submit form state
  const [date, setDate]                 = useState('');
  const [toStatus, setToStatus]         = useState('present');
  const [requestReason, setRequestReason] = useState('');

  // Review state
  const [reviewComment, setReviewComment] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['regularizations', status],
    queryFn: () => getRegularizations(status !== 'all' ? `status=${status}` : undefined),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const submitMutation = useMutation({
    mutationFn: submitRegularization,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regularizations'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowForm(false);
      setDate(''); setRequestReason(''); setToStatus('present');
      Alert.alert('Request Submitted', 'Your regularization request has been sent for review.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const reviewMutation = useMutation({
    mutationFn: reviewRegularization,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regularizations'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowReview(null);
      setReviewComment('');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const items: any[] = data?.regularizations ?? data?.requests ?? data?.data ?? [];

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
        <Text style={styles.screenTitle}>Regularization</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowForm(true); }}
        >
          <Text style={styles.addBtnText}>+ Request</Text>
        </TouchableOpacity>
      </MotiView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, status === s && styles.chipActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStatus(s); }}
          >
            <Text style={[styles.chipText, status === s && { color: COLORS.white }]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          renderItem={({ item, index }) => {
            const color = STATUS_COLOR[item.status ?? 'pending'] ?? COLORS.textMuted;
            const employeeName = item.user
              ? `${item.user.firstName ?? ''} ${item.user.lastName ?? ''}`.trim()
              : item.employeeName ?? '';
            return (
              <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={{ flex: 1 }}>
                      {employeeName ? <Text style={styles.employeeName}>{employeeName}</Text> : null}
                      <Text style={styles.dateText}>📅 {fmtDate(item.date ?? item.attendance_date)}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.badgeText, { color }]}>{item.status ?? 'pending'}</Text>
                    </View>
                  </View>

                  <View style={styles.changeRow}>
                    <View style={styles.changePill}>
                      <Text style={styles.changePillText}>{(item.fromStatus ?? item.from_status ?? 'absent').replace(/_/g, ' ')}</Text>
                    </View>
                    <Text style={styles.arrow}>→</Text>
                    <View style={[styles.changePill, { backgroundColor: COLORS.brand + '22', borderColor: COLORS.brand }]}>
                      <Text style={[styles.changePillText, { color: COLORS.brand }]}>{(item.toStatus ?? item.to_status ?? 'present').replace(/_/g, ' ')}</Text>
                    </View>
                  </View>

                  {item.reason && <Text style={styles.reason}>{item.reason}</Text>}
                  {item.reviewComment && (
                    <Text style={styles.reviewNote}>Note: {item.reviewComment}</Text>
                  )}

                  {isAdmin && item.status === 'pending' && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#10b98122', borderColor: '#10b981' }]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowReview({ ...item, action: 'approve' }); }}
                      >
                        <Text style={[styles.actionBtnText, { color: '#10b981' }]}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#ef444422', borderColor: '#ef4444' }]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowReview({ ...item, action: 'reject' }); }}
                      >
                        <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </MotiView>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No Requests</Text>
              <Text style={styles.emptySubtitle}>Submit a regularization request using the button above.</Text>
            </View>
          }
        />
      )}

      {/* Submit Form Modal */}
      <Modal visible={showForm} animationType="none" transparent onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowForm(false)} />
          <AnimatePresence>
            {showForm && (
              <MotiView from={{ translateY: 500 }} animate={{ translateY: 0 }} exit={{ translateY: 500 }} transition={{ type: 'spring', damping: 22, stiffness: 200 }} style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Request Regularization</Text>

                <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 2026-06-01"
                  placeholderTextColor={COLORS.textMuted}
                  value={date}
                  onChangeText={setDate}
                  keyboardType="numbers-and-punctuation"
                />

                <Text style={styles.fieldLabel}>Change Status To</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {TO_STATUS_LABELS.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.chip, toStatus === s && styles.chipActive]}
                        onPress={() => { setToStatus(s); Haptics.selectionAsync(); }}
                      >
                        <Text style={[styles.chipText, toStatus === s && { color: COLORS.white }]}>{s.replace(/_/g, ' ')}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={styles.fieldLabel}>Reason</Text>
                <TextInput
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder="Explain why this correction is needed..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  value={requestReason}
                  onChangeText={setRequestReason}
                />

                <Button
                  label="Submit Request"
                  onPress={() => {
                    if (!date) { Alert.alert('Enter a date'); return; }
                    submitMutation.mutate({ date, toStatus, reason: requestReason });
                  }}
                  loading={submitMutation.isPending}
                />
                <Button label="Cancel" variant="ghost" onPress={() => setShowForm(false)} />
              </MotiView>
            )}
          </AnimatePresence>
        </KeyboardAvoidingView>
      </Modal>

      {/* Review Modal */}
      <Modal visible={!!showReview} animationType="none" transparent onRequestClose={() => setShowReview(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowReview(null)} />
          <AnimatePresence>
            {!!showReview && (
              <MotiView from={{ translateY: 500 }} animate={{ translateY: 0 }} exit={{ translateY: 500 }} transition={{ type: 'spring', damping: 22, stiffness: 200 }} style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>
                  {showReview?.action === 'approve' ? '✅ Approve' : '❌ Reject'} Request
                </Text>

                <Text style={styles.fieldLabel}>Comment (optional)</Text>
                <TextInput
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder="Add a note for the employee..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  value={reviewComment}
                  onChangeText={setReviewComment}
                />

                <Button
                  label={showReview?.action === 'approve' ? 'Approve' : 'Reject'}
                  variant={showReview?.action === 'approve' ? 'primary' : 'danger'}
                  onPress={() => reviewMutation.mutate({ id: showReview.id, action: showReview.action, comment: reviewComment })}
                  loading={reviewMutation.isPending}
                />
                <Button label="Cancel" variant="ghost" onPress={() => { setShowReview(null); setReviewComment(''); }} />
              </MotiView>
            )}
          </AnimatePresence>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.bg },
  topBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:          { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle:   { ...FONTS.bold, fontSize: 20, color: COLORS.text },
  addBtn:        { backgroundColor: COLORS.brand, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText:    { ...FONTS.bold, fontSize: 13, color: COLORS.white },
  filtersRow:    { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip:          { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.cardBorder },
  chipActive:    { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText:      { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13 },
  list:          { padding: 20, paddingBottom: 40 },
  card:          { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  employeeName:  { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  dateText:      { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 3 },
  badge:         { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:     { ...FONTS.bold, fontSize: 12, textTransform: 'capitalize' },
  changeRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  changePill:    { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.cardBorder },
  changePillText:{ ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, textTransform: 'capitalize' },
  arrow:         { ...FONTS.bold, fontSize: 16, color: COLORS.textMuted },
  reason:        { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  reviewNote:    { ...FONTS.medium, fontSize: 12, color: COLORS.brand, marginTop: 4 },
  actionRow:     { flexDirection: 'row', marginTop: 10, gap: 10 },
  actionBtn:     { borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  actionBtnText: { ...FONTS.bold, fontSize: 13 },
  overlay:       { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:         { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: COLORS.cardBorder },
  sheetHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.cardBorder, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:    { ...FONTS.bold, fontSize: 18, color: COLORS.text, marginBottom: 16 },
  fieldLabel:    { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginBottom: 6 },
  textInput:     { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.cardBorder, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 15, marginBottom: 12 },
  emptyState:    { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyEmoji:    { fontSize: 48, marginBottom: 14 },
  emptyTitle:    { ...FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: 6 },
  emptySubtitle: { ...FONTS.regular, fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
