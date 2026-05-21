import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getConsultantSessions } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const STATUS_COLOR: Record<string, string> = { scheduled: '#3b82f6', completed: '#10b981', cancelled: '#ef4444', pending: '#f59e0b' };

export default function ConsultantSessionsScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ['consultant-sessions'], queryFn: getConsultantSessions });
  const sessions: any[] = data?.sessions ?? data?.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>My Sessions</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const color = STATUS_COLOR[item.status ?? 'scheduled'] ?? COLORS.textMuted;
            return (
              <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientName}>{item.client_name ?? item.student_name ?? item.user_name ?? 'Client'}</Text>
                      {item.scheduled_at && <Text style={styles.dateText}>📅 {new Date(item.scheduled_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>}
                      {item.duration && <Text style={styles.duration}>⏱ {item.duration} min</Text>}
                    </View>
                    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.badgeText, { color }]}>{item.status ?? 'scheduled'}</Text>
                    </View>
                  </View>
                  {item.notes && <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>}
                </View>
              </MotiView>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🧑‍💼</Text>
              <Text style={styles.emptyText}>No sessions yet</Text>
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
  list:        { padding: 20, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  clientName:  { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  dateText:    { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  duration:    { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  notes:       { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  badge:       { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:   { ...FONTS.medium, fontSize: 12, textTransform: 'capitalize' },
  emptyState:  { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
