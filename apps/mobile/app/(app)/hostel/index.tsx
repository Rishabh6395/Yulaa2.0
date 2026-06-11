import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getHostelInfo } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { useAuth } from '../../../src/context/AuthContext';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const TABS = ['My Room', 'All Blocks'];

export default function HostelScreen() {
  const router   = useRouter();
  const { user } = useAuth();
  const isAdmin  = ['school_admin', 'principal'].includes(user?.primaryRole ?? '');
  const [tab, setTab]           = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['hostel', tab],
    queryFn: () => getHostelInfo(tab === 0 ? 'mine=true' : undefined),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const myAllocation = data?.allocation ?? data?.myRoom ?? null;
  const blocks: any[] = data?.blocks ?? data?.data ?? [];

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
        <Text style={styles.screenTitle}>Hostel</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {isAdmin && (
        <View style={styles.tabBar}>
          {TABS.map((t, i) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === i && styles.tabActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(i); }}
            >
              <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : tab === 0 || !isAdmin ? (
        /* MY ROOM VIEW */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
        >
          {myAllocation ? (
            <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', delay: 0, damping: 18 }}>
              {/* Room Card */}
              <View style={styles.roomCard}>
                <Text style={styles.roomEmoji}>🏠</Text>
                <Text style={styles.roomNumber}>{myAllocation.room?.roomNumber ?? myAllocation.roomNumber ?? 'Room'}</Text>
                <Text style={styles.blockName}>{myAllocation.block?.name ?? myAllocation.blockName ?? ''}</Text>
                {myAllocation.room?.floor != null && (
                  <Text style={styles.floorText}>Floor {myAllocation.room.floor}</Text>
                )}
                <View style={styles.roomTypeBadge}>
                  <Text style={styles.roomTypeText}>{myAllocation.room?.roomType ?? myAllocation.roomType ?? 'Standard'}</Text>
                </View>
              </View>

              {/* Details */}
              <View style={styles.detailsCard}>
                {myAllocation.room?.capacity != null && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Capacity</Text>
                    <Text style={styles.detailValue}>{myAllocation.room.capacity} beds</Text>
                  </View>
                )}
                {myAllocation.startDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Check-in</Text>
                    <Text style={styles.detailValue}>{new Date(myAllocation.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  </View>
                )}
                {myAllocation.endDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Check-out</Text>
                    <Text style={styles.detailValue}>{new Date(myAllocation.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  </View>
                )}
                {myAllocation.remarks && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>{myAllocation.remarks}</Text>
                  </View>
                )}
              </View>
            </MotiView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏨</Text>
              <Text style={styles.emptyTitle}>No Room Assigned</Text>
              <Text style={styles.emptySubtitle}>You have not been allocated a hostel room yet. Contact the hostel administration.</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        /* ALL BLOCKS VIEW (Admin) */
        <FlatList
          data={blocks}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          renderItem={({ item, index }) => {
            const rooms: any[]  = item.rooms ?? [];
            const occupied      = rooms.filter((r: any) => (r.currentOccupancy ?? r.occupancy ?? 0) > 0).length;
            const totalCapacity = rooms.reduce((s: number, r: any) => s + (r.capacity ?? 0), 0);
            const occupied_beds = rooms.reduce((s: number, r: any) => s + (r.currentOccupancy ?? r.occupancy ?? 0), 0);
            const pct           = totalCapacity > 0 ? Math.round((occupied_beds / totalCapacity) * 100) : 0;

            return (
              <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 60, damping: 18 }}>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.blockNameLarge}>{item.name ?? 'Block'}</Text>
                    <Text style={styles.genderBadge}>{item.gender ?? 'Mixed'}</Text>
                  </View>
                  <View style={styles.statsRow}>
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{rooms.length}</Text>
                      <Text style={styles.statLabel}>Rooms</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{occupied_beds}</Text>
                      <Text style={styles.statLabel}>Occupied</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{totalCapacity - occupied_beds}</Text>
                      <Text style={styles.statLabel}>Vacant</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={[styles.statValue, { color: pct > 80 ? '#ef4444' : COLORS.brand }]}>{pct}%</Text>
                      <Text style={styles.statLabel}>Full</Text>
                    </View>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: pct > 80 ? '#ef4444' : COLORS.brand }]} />
                  </View>
                  {item.warden && <Text style={styles.warden}>👤 Warden: {item.warden}</Text>}
                </View>
              </MotiView>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏨</Text>
              <Text style={styles.emptyTitle}>No Hostel Blocks</Text>
              <Text style={styles.emptySubtitle}>No hostel blocks have been configured yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.bg },
  topBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:          { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle:   { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  tabBar:        { flexDirection: 'row', marginHorizontal: 20, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 4, marginBottom: 12 },
  tab:           { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: RADIUS.md },
  tabActive:     { backgroundColor: COLORS.brand },
  tabText:       { ...FONTS.medium, fontSize: 14, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.white },
  scrollContent: { padding: 20, paddingBottom: 40 },
  roomCard:      { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.brand + '44', padding: 24, alignItems: 'center', marginBottom: 16, ...SHADOW.lg },
  roomEmoji:     { fontSize: 48, marginBottom: 12 },
  roomNumber:    { ...FONTS.xbold, fontSize: 32, color: COLORS.text, marginBottom: 4 },
  blockName:     { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
  floorText:     { ...FONTS.regular, fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  roomTypeBadge: { marginTop: 12, backgroundColor: COLORS.brand + '22', borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 6 },
  roomTypeText:  { ...FONTS.bold, fontSize: 14, color: COLORS.brand, textTransform: 'capitalize' },
  detailsCard:   { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, ...SHADOW.sm },
  detailRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  detailLabel:   { ...FONTS.medium, fontSize: 14, color: COLORS.textMuted },
  detailValue:   { ...FONTS.bold, fontSize: 14, color: COLORS.text },
  list:          { padding: 20, paddingBottom: 40 },
  card:          { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  blockNameLarge:{ ...FONTS.bold, fontSize: 17, color: COLORS.text },
  genderBadge:   { ...FONTS.medium, fontSize: 12, color: COLORS.brand, backgroundColor: COLORS.brand + '22', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, textTransform: 'capitalize' },
  statsRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  stat:          { alignItems: 'center', flex: 1 },
  statValue:     { ...FONTS.bold, fontSize: 20, color: COLORS.text },
  statLabel:     { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  progressBg:    { height: 6, backgroundColor: COLORS.surface, borderRadius: 3, marginBottom: 8 },
  progressFill:  { height: 6, borderRadius: 3 },
  warden:        { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  emptyState:    { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyEmoji:    { fontSize: 48, marginBottom: 14 },
  emptyTitle:    { ...FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: 6 },
  emptySubtitle: { ...FONTS.regular, fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
