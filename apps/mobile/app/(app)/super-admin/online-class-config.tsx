import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getSuperAdminOnlineClassConfig } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function SuperAdminOnlineClassConfigScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['super-online-class-config'],
    queryFn: getSuperAdminOnlineClassConfig,
  });
  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const configs: any[] = data?.configs ?? data?.data ?? (Array.isArray(data) ? data : []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Online Class Config</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={configs}
          keyExtractor={(item, i) => item.id ?? item.key ?? String(i)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 40, damping: 18 }}>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.iconBox}><Text style={{ fontSize: 22 }}>🖥️</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.configName}>{item.name ?? item.title ?? item.key ?? 'Config'}</Text>
                    {item.provider && <Text style={styles.meta}>Provider: {item.provider}</Text>}
                    {item.url && <Text style={styles.meta}>🔗 {item.url}</Text>}
                    {item.description && <Text style={styles.desc}>{item.description}</Text>}
                  </View>
                  {item.enabled !== undefined && (
                    <View style={[styles.badge, item.enabled ? styles.badgeActive : styles.badgeInactive]}>
                      <Text style={styles.badgeText}>{item.enabled ? 'enabled' : 'disabled'}</Text>
                    </View>
                  )}
                </View>
              </View>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🖥️</Text>
              <Text style={styles.emptyText}>No online class configs found</Text>
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
  list:         { padding: 20, paddingBottom: 40 },
  card:         { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 14, marginBottom: 10, ...SHADOW.sm },
  cardRow:      { flexDirection: 'row', alignItems: 'flex-start' },
  iconBox:      { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.brand + '22', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  configName:   { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  meta:         { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  desc:         { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  badge:        { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 },
  badgeActive:  { backgroundColor: '#10b98122' },
  badgeInactive:{ backgroundColor: COLORS.surface },
  badgeText:    { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, textTransform: 'capitalize' },
  emptyState:   { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:   { fontSize: 48, marginBottom: 14 },
  emptyText:    { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
