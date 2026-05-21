import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getCareerSessions, getMyBookings, cancelBooking } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function CareerSessionsScreen() {
  const { user } = useAuth();
  const router   = useRouter();
  const qc       = useQueryClient();
  const role     = user?.primaryRole ?? '';
  const [tab, setTab] = useState<'browse' | 'bookings'>('browse');
  const [refreshing, setRefreshing] = useState(false);

  const { data: sessionsData, isLoading: sessLoading, refetch: refetchSess } = useQuery({
    queryKey: ['career-sessions'],
    queryFn: () => getCareerSessions(),
  });
  const { data: bookingsData, isLoading: bookLoading, refetch: refetchBook } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: getMyBookings,
    enabled: tab === 'bookings',
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-bookings'] }); Alert.alert('Cancelled', 'Your booking has been cancelled.'); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await (tab === 'browse' ? refetchSess() : refetchBook());
    setRefreshing(false);
  }, [tab, refetchSess, refetchBook]);

  const sessions: any[]  = sessionsData?.sessions ?? sessionsData?.consultants ?? sessionsData?.data ?? [];
  const bookings: any[]  = bookingsData?.bookings ?? bookingsData?.data ?? [];
  const items = tab === 'browse' ? sessions : bookings;
  const isLoading = tab === 'browse' ? sessLoading : bookLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Career Sessions</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      <View style={styles.tabRow}>
        {(['browse', 'bookings'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t); }}>
            <Text style={[styles.tabText, tab === t && { color: COLORS.brand }]}>
              {t === 'browse' ? '🔍 Browse' : '📌 My Bookings'}
            </Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(item.name ?? item.consultant_name ?? 'C').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name ?? item.consultant_name ?? item.session_title ?? 'Session'}</Text>
                    {item.expertise && <Text style={styles.expertise}>{item.expertise}</Text>}
                    {item.scheduled_at && <Text style={styles.dateText}>📅 {new Date(item.scheduled_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>}
                  </View>
                </View>
                {tab === 'browse' && (
                  <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => router.push(`/(app)/career-sessions/book?consultantId=${item.id}`)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.bookGrad}>
                      <Text style={styles.bookText}>Book Session</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                {tab === 'bookings' && item.status !== 'cancelled' && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); cancelMutation.mutate(item.id); }} activeOpacity={0.8}>
                    <Text style={styles.cancelText}>Cancel Booking</Text>
                  </TouchableOpacity>
                )}
              </View>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎯</Text>
              <Text style={styles.emptyText}>{tab === 'browse' ? 'No sessions available' : 'No bookings yet'}</Text>
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
  screenTitle: { ...FONTS.bold, fontSize: 20, color: COLORS.text },
  tabRow:      { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 4 },
  tabBtn:      { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.md },
  tabActive:   { backgroundColor: COLORS.card },
  tabText:     { ...FONTS.medium, fontSize: 14, color: COLORS.textMuted },
  list:        { padding: 20, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.brand + '33', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:  { ...FONTS.bold, fontSize: 18, color: COLORS.brand },
  name:        { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  expertise:   { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  dateText:    { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  bookBtn:     { borderRadius: RADIUS.md, overflow: 'hidden', alignSelf: 'flex-start' },
  bookGrad:    { paddingHorizontal: 20, paddingVertical: 10 },
  bookText:    { ...FONTS.bold, color: COLORS.white, fontSize: 14 },
  cancelBtn:   { paddingVertical: 8, alignItems: 'center' },
  cancelText:  { ...FONTS.medium, fontSize: 14, color: '#ef4444' },
  emptyState:  { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
