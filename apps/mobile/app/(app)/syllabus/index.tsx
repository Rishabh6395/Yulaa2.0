import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getSyllabus } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function SyllabusScreen() {
  const router = useRouter();
  const [subject, setSubject] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['syllabus'], queryFn: () => getSyllabus() });

  const items: any[] = data?.syllabus ?? data?.data ?? [];
  const subjects = Array.from(new Set(items.map((i: any) => i.subject ?? i.subject_name).filter(Boolean)));
  const filtered = subject ? items.filter((i: any) => (i.subject ?? i.subject_name) === subject) : items;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Syllabus</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {subjects.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          <TouchableOpacity style={[styles.chip, !subject && styles.chipActive]} onPress={() => setSubject(null)}>
            <Text style={[styles.chipText, !subject && { color: COLORS.white }]}>All</Text>
          </TouchableOpacity>
          {subjects.map(s => (
            <TouchableOpacity key={s} style={[styles.chip, subject === s && styles.chipActive]} onPress={() => setSubject(s)}>
              <Text style={[styles.chipText, subject === s && { color: COLORS.white }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.chapterName}>{item.chapter ?? item.topic ?? item.title ?? 'Chapter'}</Text>
                  {item.status && (
                    <View style={[styles.badge, item.status === 'completed' ? styles.badgeDone : styles.badgePending]}>
                      <Text style={styles.badgeText}>{item.status}</Text>
                    </View>
                  )}
                </View>
                {(item.subject ?? item.subject_name) && (
                  <Text style={styles.subjectLabel}>{item.subject ?? item.subject_name}</Text>
                )}
                {item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
                {item.weightage != null && <Text style={styles.meta}>Weightage: {item.weightage}%</Text>}
              </View>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📖</Text>
              <Text style={styles.emptyText}>No syllabus items found</Text>
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
  chipText:    { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13 },
  list:        { padding: 20, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  chapterName: { ...FONTS.bold, fontSize: 15, color: COLORS.text, flex: 1 },
  subjectLabel:{ ...FONTS.medium, fontSize: 13, color: COLORS.brand, marginBottom: 4 },
  desc:        { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  meta:        { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
  badge:       { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeDone:   { backgroundColor: '#10b98122' },
  badgePending:{ backgroundColor: COLORS.surface },
  badgeText:   { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, textTransform: 'capitalize' },
  emptyState:  { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
