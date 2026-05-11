import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Alert, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { getConsultants, getMyBookings, bookSession, cancelBooking, rateSession } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

type Tab = 'browse' | 'bookings';

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending:   { bg: COLORS.amber + '22', text: COLORS.amber },
  confirmed: { bg: COLORS.brand + '22', text: COLORS.brand },
  completed: { bg: COLORS.green + '22', text: COLORS.green },
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

export default function CareerSessionsScreen() {
  const { user } = useAuth();
  const router   = useRouter();
  const qc       = useQueryClient();
  const [tab, setTab] = useState<Tab>('browse');
  const [refreshing, setRefreshing] = useState(false);

  // Rating modal state
  const [ratingModal, setRatingModal] = useState<{ bookingId: string } | null>(null);
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState('');

  const { data: consultantsData, isLoading: loadingC, refetch: refetchC } = useQuery({
    queryKey: ['consultants'],
    queryFn: getConsultants,
    enabled: tab === 'browse',
  });
  const { data: bookingsData, isLoading: loadingB, refetch: refetchB } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: getMyBookings,
    enabled: tab === 'bookings',
  });

  const consultants: any[] = consultantsData?.consultants ?? [];
  const bookings: any[]    = bookingsData?.bookings ?? [];

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-bookings'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const rateMut = useMutation({
    mutationFn: ({ id, r, rv }: { id: string; r: number; rv: string }) => rateSession(id, r, rv),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-bookings'] }); setRatingModal(null); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchC(), refetchB()]);
    setRefreshing(false);
  };

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
            <Text style={styles.title}>Career Sessions</Text>
            <Text style={styles.subtitle}>Expert career guidance</Text>
          </View>
        </MotiView>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['browse', 'bookings'] as Tab[]).map(t => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)} activeOpacity={0.8}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'browse' ? '🔍 Browse' : '📅 My Bookings'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Browse tab */}
        {tab === 'browse' && (
          loadingC ? <>{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</> :
          consultants.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyIcon}>🎓</Text><Text style={styles.emptyTitle}>No consultants available</Text></View>
          ) : consultants.map((row: any, i: number) => {
            const c = row.consultant ?? row;
            return (
              <MotiView key={c.id ?? row.contract_id} from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: i * 60, damping: 18 }}>
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => router.push(`/(app)/career-sessions/${c.id}` as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.consultantHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{(c.name ?? 'C')[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.consultantName}>{c.name}</Text>
                      <Text style={styles.specialization}>{c.specialization ?? 'Career Counselling'}</Text>
                    </View>
                    {c.avg_rating && (
                      <Text style={styles.rating}>⭐ {c.avg_rating}</Text>
                    )}
                  </View>
                  {c.session_fee && (
                    <Text style={styles.fee}>₹{Number(c.session_fee).toLocaleString('en-IN')} / session</Text>
                  )}
                  <Text style={[styles.bookLink, { color: COLORS.gold }]}>Book Session →</Text>
                </TouchableOpacity>
              </MotiView>
            );
          })
        )}

        {/* My Bookings tab */}
        {tab === 'bookings' && (
          loadingB ? <>{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</> :
          bookings.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyIcon}>📅</Text><Text style={styles.emptyTitle}>No bookings yet</Text><Text style={styles.emptySubtitle}>Browse consultants and book a session</Text></View>
          ) : bookings.map((b: any, i: number) => {
            const ss = STATUS_STYLE[b.status] ?? STATUS_STYLE.pending;
            return (
              <MotiView key={b.id} from={{ opacity: 0, translateX: -12 }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: 'spring', delay: i * 55, damping: 18 }}>
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                      <Text style={[styles.statusText, { color: ss.text }]}>{b.status?.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.consultantName}>{b.consultant?.name ?? 'Consultant'}</Text>
                  {b.date && <Text style={styles.bookingDate}>{new Date(b.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })} · {b.start_time}</Text>}
                  {b.mode && <Text style={styles.bookingMode}>Mode: {b.mode}</Text>}
                  {b.rating && <Text style={styles.ratedText}>⭐ {b.rating}/5 — {b.review}</Text>}

                  <View style={styles.cardActions}>
                    {['pending', 'confirmed'].includes(b.status) && (
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.red + '22', borderColor: COLORS.red + '44' }]} onPress={() => cancelMut.mutate(b.id)} activeOpacity={0.8}>
                        <Text style={[styles.actionBtnText, { color: COLORS.red }]}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                    {b.status === 'completed' && !b.rating && (
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.gold + '22', borderColor: COLORS.gold + '44' }]} onPress={() => { setStars(5); setReview(''); setRatingModal({ bookingId: b.id }); }} activeOpacity={0.8}>
                        <Text style={[styles.actionBtnText, { color: COLORS.gold }]}>Rate Session</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </MotiView>
            );
          })
        )}
      </ScrollView>

      {/* Rating Modal */}
      <Modal visible={!!ratingModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate Your Session</Text>
            <StarRow value={stars} onSelect={setStars} />
            <TextInput
              style={styles.reviewInput}
              placeholder="Write a review (optional)"
              placeholderTextColor={COLORS.textMuted}
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={3}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.surface }]} onPress={() => setRatingModal(null)}>
                <Text style={{ ...FONTS.medium, color: COLORS.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: COLORS.brand, flex: 1 }]}
                onPress={() => rateMut.mutate({ id: ratingModal!.bookingId, r: stars, rv: review })}
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
  cardTop:     { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  statusText:  { ...FONTS.bold, fontSize: 10 },

  consultantHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.brand + '33', alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...FONTS.bold, fontSize: 18, color: COLORS.brand },
  consultantName: { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  specialization: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rating: { ...FONTS.bold, fontSize: 13, color: COLORS.gold },
  fee:    { ...FONTS.medium, fontSize: 13, color: COLORS.text, marginBottom: 8 },
  bookLink: { ...FONTS.bold, fontSize: 13 },

  bookingDate: { ...FONTS.medium, fontSize: 13, color: COLORS.text, marginBottom: 4 },
  bookingMode: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  ratedText:   { ...FONTS.regular, fontSize: 12, color: COLORS.gold, marginTop: 4 },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.lg, borderWidth: 1 },
  actionBtnText: { ...FONTS.bold, fontSize: 12 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon:     { fontSize: 44 },
  emptyTitle:    { ...FONTS.bold, fontSize: 16, color: COLORS.textMuted },
  emptySubtitle: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted + 'aa', textAlign: 'center' },

  modalBg: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: 24, ...SHADOW.lg,
  },
  modalTitle:   { ...FONTS.bold, fontSize: 18, color: COLORS.text, marginBottom: 4 },
  reviewInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.cardBorder,
    color: COLORS.text, padding: 14, fontSize: 14, ...FONTS.regular,
    minHeight: 80, textAlignVertical: 'top',
  },
  modalBtn: {
    paddingVertical: 13, paddingHorizontal: 20, borderRadius: RADIUS.lg, alignItems: 'center',
  },
});
