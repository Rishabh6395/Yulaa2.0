import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { apiFetch } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function SchoolDefaultScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['school-default'],
    queryFn: () => apiFetch<any>('/api/super-admin/schools/default'),
  });

  const settings: any[] = data
    ? Object.entries(data).map(([key, value]) => ({ key, value }))
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Default Settings</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={settings}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 30, damping: 18 }}>
              <View style={styles.row}>
                <Text style={styles.settingKey}>{item.key.replace(/_/g, ' ')}</Text>
                <Text style={styles.settingValue} numberOfLines={1}>{String(item.value ?? '—')}</Text>
              </View>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>⚙️</Text>
              <Text style={styles.emptyText}>No default settings found</Text>
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
  row:          { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.cardBorder, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...SHADOW.sm },
  settingKey:   { ...FONTS.medium, fontSize: 14, color: COLORS.text, textTransform: 'capitalize', flex: 1 },
  settingValue: { ...FONTS.regular, fontSize: 14, color: COLORS.textMuted, flex: 1, textAlign: 'right' },
  emptyState:   { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:   { fontSize: 48, marginBottom: 14 },
  emptyText:    { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
