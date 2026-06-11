import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getReportCards } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { useAuth } from '../../../src/context/AuthContext';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const RATING_COLOR: Record<string, string> = {
  outstanding: '#10b981',
  excellent:   '#3b82f6',
  good:        '#8b5cf6',
  average:     '#f59e0b',
  below_average: '#ef4444',
};

function ScoreBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ ...FONTS.medium, fontSize: 13, color: COLORS.textMuted }}>{label}</Text>
        <Text style={{ ...FONTS.bold, fontSize: 13, color }}>{value}%</Text>
      </View>
      <View style={{ height: 6, backgroundColor: COLORS.surface, borderRadius: 3 }}>
        <View style={{ height: 6, width: `${pct}%` as any, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

export default function ReportCardsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = ['school_admin', 'principal', 'hod'].includes(user?.primaryRole ?? '');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['report-cards'],
    queryFn: () => getReportCards(),
  });

  const cards: any[] = data?.reportCards ?? data?.report_cards ?? data?.data ?? [];

  function toggleExpand(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(prev => (prev === id ? null : id));
  }

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
        <Text style={styles.screenTitle}>Report Cards</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const isOpen = expanded === (item.id ?? String(index));
            const rating = item.overallRating ?? item.overall_rating ?? 'average';
            const ratingColor = RATING_COLOR[rating] ?? COLORS.textMuted;
            const score = item.compositeScore ?? item.composite_score ?? 0;
            const studentName = item.student?.firstName
              ? `${item.student.firstName} ${item.student.lastName ?? ''}`.trim()
              : item.studentName ?? 'Student';

            return (
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: index * 60, damping: 18 }}
              >
                <TouchableOpacity style={styles.card} onPress={() => toggleExpand(item.id ?? String(index))} activeOpacity={0.8}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{studentName}</Text>
                      <Text style={styles.classMeta}>
                        {item.class?.name ?? item.className ?? ''}{item.academicYear ? ` · ${item.academicYear}` : ''}
                        {item.term ? ` · ${item.term}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={[styles.ratingBadge, { backgroundColor: ratingColor + '22' }]}>
                        <Text style={[styles.ratingText, { color: ratingColor }]}>
                          {rating.replace(/_/g, ' ')}
                        </Text>
                      </View>
                      <Text style={[styles.scoreText, { color: ratingColor }]}>{score.toFixed(1)}%</Text>
                    </View>
                  </View>

                  {isOpen && (
                    <MotiView
                      from={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' as any }}
                      transition={{ type: 'spring', damping: 20 }}
                      style={styles.breakdown}
                    >
                      <View style={styles.divider} />
                      {item.academicScore   != null && <ScoreBar label="Academic"    value={Number(item.academicScore.toFixed(1))}    color="#3b82f6" />}
                      {item.attendanceScore != null && <ScoreBar label="Attendance"  value={Number(item.attendanceScore.toFixed(1))}  color="#10b981" />}
                      {item.behaviorScore   != null && <ScoreBar label="Behavior"    value={Number(item.behaviorScore.toFixed(1))}    color="#8b5cf6" />}
                      {item.ecoScore        != null && <ScoreBar label="ECO / Activities" value={Number(item.ecoScore.toFixed(1))}  color="#f59e0b" />}
                      {item.teacherRemarks && (
                        <View style={styles.remarksBox}>
                          <Text style={styles.remarksLabel}>Teacher Remarks</Text>
                          <Text style={styles.remarksText}>{item.teacherRemarks}</Text>
                        </View>
                      )}
                    </MotiView>
                  )}

                  <Text style={styles.expandHint}>{isOpen ? '▲ Less' : '▼ Details'}</Text>
                </TouchableOpacity>
              </MotiView>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyTitle}>No Report Cards</Text>
              <Text style={styles.emptySubtitle}>
                {isAdmin ? 'Generate report cards from the web dashboard.' : 'No report cards have been published yet.'}
              </Text>
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
  card:         { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start' },
  studentName:  { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  classMeta:    { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 3 },
  ratingBadge:  { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  ratingText:   { ...FONTS.bold, fontSize: 12, textTransform: 'capitalize' },
  scoreText:    { ...FONTS.xbold, fontSize: 20 },
  breakdown:    { overflow: 'hidden' },
  divider:      { height: 1, backgroundColor: COLORS.cardBorder, marginVertical: 12 },
  remarksBox:   { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, marginTop: 4 },
  remarksLabel: { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  remarksText:  { ...FONTS.regular, fontSize: 13, color: COLORS.text, lineHeight: 19 },
  expandHint:   { ...FONTS.medium, fontSize: 12, color: COLORS.brand, textAlign: 'right', marginTop: 10 },
  emptyState:   { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyEmoji:   { fontSize: 48, marginBottom: 14 },
  emptyTitle:   { ...FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: 6 },
  emptySubtitle:{ ...FONTS.regular, fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
