import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getSchoolDetail } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const SECTIONS = [
  { key: 'admission-settings', label: 'Admission Settings',  emoji: '📋' },
  { key: 'workflow',           label: 'Admission Workflow',  emoji: '🔀' },
  { key: 'form-config',        label: 'Form Config',         emoji: '📝' },
  { key: 'external-config',    label: 'External Config',     emoji: '🔌' },
  { key: 'menu-permissions',   label: 'Menu Permissions',    emoji: '📋' },
  { key: 'year-cycle',         label: 'Year Cycle',          emoji: '📆' },
  { key: 'fees',               label: 'Fee Structures',      emoji: '💰' },
  { key: 'users-roles',        label: 'Users & Roles',       emoji: '👥' },
  { key: 'classes',            label: 'Classes',             emoji: '🎒' },
  { key: 'teachers',           label: 'Teachers',            emoji: '👩‍🏫' },
  { key: 'students',           label: 'Students',            emoji: '🎓' },
  { key: 'timetable',          label: 'Timetable',           emoji: '🗓️' },
  { key: 'attendance',         label: 'Attendance Config',   emoji: '📋' },
  { key: 'leave',              label: 'Leave Config',        emoji: '🗓️' },
  { key: 'compliance',         label: 'Compliance',          emoji: '✅' },
  { key: 'transport',          label: 'Transport',           emoji: '🚌' },
  { key: 'homework',           label: 'Homework',            emoji: '📚' },
  { key: 'performance',        label: 'Performance',         emoji: '📊' },
  { key: 'report-cards',       label: 'Report Cards',        emoji: '📄' },
  { key: 'reports',            label: 'Reports',             emoji: '📈' },
  { key: 'admissions',         label: 'Admissions',          emoji: '📋' },
  { key: 'announcements',      label: 'Announcements',       emoji: '📢' },
  { key: 'parents',            label: 'Parents',             emoji: '👨‍👩‍👧' },
];

export default function SchoolDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['school-detail', id],
    queryFn: () => getSchoolDetail(id),
    enabled: !!id,
  });

  const school = data?.school ?? data;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle} numberOfLines={1}>{school?.name ?? 'School Detail'}</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <>
          {school && (
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', delay: 100 }} style={styles.infoCard}>
              <Text style={styles.schoolName}>{school.name ?? 'School'}</Text>
              {school.city && <Text style={styles.schoolMeta}>📍 {school.city}{school.state ? `, ${school.state}` : ''}</Text>}
              {school.email && <Text style={styles.schoolMeta}>✉️ {school.email}</Text>}
              {school.phone && <Text style={styles.schoolMeta}>📞 {school.phone}</Text>}
            </MotiView>
          )}
          <FlatList
            data={SECTIONS}
            keyExtractor={item => item.key}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={{ gap: 12 }}
            renderItem={({ item, index }) => (
              <MotiView from={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', delay: index * 30, damping: 16 }} style={{ flex: 1 }}>
                <TouchableOpacity
                  style={styles.sectionCard}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.sectionEmoji}>{item.emoji}</Text>
                  <Text style={styles.sectionLabel}>{item.label}</Text>
                </TouchableOpacity>
              </MotiView>
            )}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.bg },
  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:        { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle: { ...FONTS.bold, fontSize: 18, color: COLORS.text, flex: 1, textAlign: 'center' },
  infoCard:    { marginHorizontal: 20, marginBottom: 16, backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, ...SHADOW.sm },
  schoolName:  { ...FONTS.bold, fontSize: 18, color: COLORS.text, marginBottom: 8 },
  schoolMeta:  { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  grid:        { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  sectionCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, alignItems: 'center', ...SHADOW.sm },
  sectionEmoji:{ fontSize: 24, marginBottom: 8 },
  sectionLabel:{ ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
});
