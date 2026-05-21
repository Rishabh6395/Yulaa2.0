import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getYearbook } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function YearbookScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ['yearbook'], queryFn: () => getYearbook() });
  const entries: any[] = data?.entries ?? data?.yearbook ?? data?.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Year Book</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, i) => item.id ?? String(i)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', delay: index * 40, damping: 16 }} style={{ flex: 1 }}>
              <TouchableOpacity style={styles.card} activeOpacity={0.8}>
                {item.photo_url ? (
                  <Image source={{ uri: item.photo_url }} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoInitial}>{(item.name ?? 'Y').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.entryName} numberOfLines={1}>{item.name ?? item.title ?? 'Entry'}</Text>
                {item.class_name && <Text style={styles.entryMeta}>{item.class_name}</Text>}
                {item.year && <Text style={styles.entryYear}>{item.year}</Text>}
              </TouchableOpacity>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📷</Text>
              <Text style={styles.emptyText}>No yearbook entries yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.bg },
  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:           { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle:    { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  grid:           { padding: 20, paddingBottom: 40, gap: 12 },
  card:           { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, overflow: 'hidden', ...SHADOW.sm },
  photo:          { width: '100%', aspectRatio: 1 },
  photoPlaceholder:{ width: '100%', aspectRatio: 1, backgroundColor: COLORS.brand + '22', alignItems: 'center', justifyContent: 'center' },
  photoInitial:   { ...FONTS.bold, fontSize: 36, color: COLORS.brand },
  entryName:      { ...FONTS.bold, fontSize: 13, color: COLORS.text, paddingHorizontal: 10, paddingTop: 10 },
  entryMeta:      { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, paddingHorizontal: 10, paddingBottom: 4 },
  entryYear:      { ...FONTS.medium, fontSize: 11, color: COLORS.brand, paddingHorizontal: 10, paddingBottom: 10 },
  emptyState:     { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:     { fontSize: 48, marginBottom: 14 },
  emptyText:      { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
