import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getTransport } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function TransportScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ['transport'], queryFn: () => getTransport() });
  const routes: any[] = data?.routes ?? data?.transport ?? data?.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Transport</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
              <View style={styles.card}>
                <View style={styles.busIcon}><Text style={{ fontSize: 28 }}>🚌</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeName}>{item.route_name ?? item.name ?? `Route ${index + 1}`}</Text>
                  {item.vehicle_number && <Text style={styles.meta}>🚗 {item.vehicle_number}</Text>}
                  {item.driver_name    && <Text style={styles.meta}>👤 {item.driver_name}</Text>}
                  {item.stops?.length  && <Text style={styles.meta}>📍 {item.stops.length} stops</Text>}
                  {item.departure_time && <Text style={styles.meta}>🕐 Departs {item.departure_time}</Text>}
                </View>
                {item.status && (
                  <View style={[styles.badge, item.status === 'active' ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                  </View>
                )}
              </View>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🚌</Text>
              <Text style={styles.emptyText}>No transport routes found</Text>
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
  screenTitle:  { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  list:         { padding: 20, paddingBottom: 40 },
  card:         { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm, flexDirection: 'row', alignItems: 'center', gap: 14 },
  busIcon:      { width: 52, height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.brand + '22', alignItems: 'center', justifyContent: 'center' },
  routeName:    { ...FONTS.bold, fontSize: 15, color: COLORS.text, marginBottom: 4 },
  meta:         { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  badge:        { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeActive:  { backgroundColor: '#10b98122' },
  badgeInactive:{ backgroundColor: COLORS.surface },
  badgeText:    { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, textTransform: 'capitalize' },
  emptyState:   { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:   { fontSize: 48, marginBottom: 14 },
  emptyText:    { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
