import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getCompliance } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const STATUSES = ['all', 'compliant', 'pending', 'non_compliant'];
const STATUS_COLOR: Record<string, string> = { compliant: '#10b981', pending: '#f59e0b', non_compliant: '#ef4444' };

export default function ComplianceScreen() {
  const router = useRouter();
  const [status, setStatus] = useState('all');
  const { data, isLoading } = useQuery({ queryKey: ['compliance', status], queryFn: () => getCompliance(status !== 'all' ? `status=${status}` : undefined) });
  const items: any[] = data?.compliance ?? data?.items ?? data?.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Compliance</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {STATUSES.map(s => (
          <TouchableOpacity key={s} style={[styles.chip, status === s && styles.chipActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStatus(s); }}>
            <Text style={[styles.chipText, status === s && { color: COLORS.white }]}>{s === 'all' ? 'All' : s.replace(/_/g, ' ')}</Text>
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
          renderItem={({ item, index }) => {
            const color = STATUS_COLOR[item.status ?? 'pending'] ?? COLORS.textMuted;
            return (
              <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <Text style={styles.itemName}>{item.name ?? item.title ?? item.compliance_type ?? 'Item'}</Text>
                    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.badgeText, { color }]}>{(item.status ?? 'pending').replace(/_/g, ' ')}</Text>
                    </View>
                  </View>
                  {item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
                  {item.due_date && <Text style={styles.dueDate}>Due: {new Date(item.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>}
                </View>
              </MotiView>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✅</Text>
              <Text style={styles.emptyText}>No compliance items found</Text>
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
  filtersRow:  { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip:        { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.cardBorder },
  chipActive:  { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText:    { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13, textTransform: 'capitalize' },
  list:        { padding: 20, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  itemName:    { ...FONTS.bold, fontSize: 15, color: COLORS.text, flex: 1 },
  desc:        { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 6 },
  dueDate:     { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted },
  badge:       { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:   { ...FONTS.medium, fontSize: 12, textTransform: 'capitalize' },
  emptyState:  { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
