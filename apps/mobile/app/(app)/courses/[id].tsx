import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { getCourse, enrollCourse } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const LESSON_ICON: Record<string, string> = {
  video: '▶️', live: '🔴', text: '📄', quiz: '📝', resource: '📎',
};

export default function CourseDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router   = useRouter();
  const qc       = useQueryClient();
  const [expanded, setExpanded] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn:  () => getCourse(id!),
  });

  const course     = data?.course;
  const enrollment = course?.enrollment;
  const isEnrolled = course?.is_enrolled ?? false;

  const enroll = useMutation({
    mutationFn: () => enrollCourse(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Enrolled!', 'You are now enrolled in this course.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const toggleModule = (modId: string) => {
    setExpanded(prev => prev.includes(modId) ? prev.filter(x => x !== modId) : [...prev, modId]);
  };

  if (isLoading) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </View>
    </SafeAreaView>
  );

  if (!course) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.content, { alignItems: 'center', paddingTop: 80 }]}>
        <Text style={{ ...FONTS.bold, color: COLORS.textMuted, fontSize: 16 }}>Course not found</Text>
      </View>
    </SafeAreaView>
  );

  const totalLessons = (course.modules ?? []).reduce((s: number, m: any) => s + (m.lessons?.length ?? 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 18 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </MotiView>

        {/* Hero */}
        <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 60, damping: 18 }} style={styles.hero}>
          <View style={styles.typeRow}>
            <View style={[styles.typeTag, { backgroundColor: COLORS.brand + '22' }]}>
              <Text style={[styles.typeTagText, { color: COLORS.brand }]}>{(course.type ?? 'recorded').toUpperCase()}</Text>
            </View>
            {(course.is_external || course.isExternal) && (
              <View style={[styles.typeTag, { backgroundColor: '#7c3aed22' }]}>
                <Text style={[styles.typeTagText, { color: '#7c3aed' }]}>EXTERNAL</Text>
              </View>
            )}
          </View>

          <Text style={styles.courseTitle}>{course.title}</Text>

          <Text style={styles.instructor}>
            👤 {course.teacher
              ? `${course.teacher.user.firstName} ${course.teacher.user.lastName}`
              : (course.instructor_name ?? course.instructorName ?? 'External Instructor')}
          </Text>

          {course.description && (
            <Text style={styles.courseDesc}>{course.description}</Text>
          )}

          <View style={styles.metaRow}>
            {totalLessons > 0 && <Text style={styles.metaChip}>📖 {totalLessons} lessons</Text>}
            {(course.totalDuration ?? course.total_duration) > 0 && (
              <Text style={styles.metaChip}>⏱ {Math.round((course.totalDuration ?? course.total_duration) / 60)} hrs</Text>
            )}
            <Text style={styles.metaChip}>👥 {course.enrolled_count ?? 0} enrolled</Text>
          </View>

          {/* Progress bar (if enrolled) */}
          {isEnrolled && enrollment && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Your Progress</Text>
                <Text style={styles.progressPct}>{Math.round(enrollment.progressPct ?? 0)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${Math.round(enrollment.progressPct ?? 0)}%` as any }]} />
              </View>
              {enrollment.certificateNo && (
                <Text style={styles.certNo}>🏆 Certificate: {enrollment.certificateNo}</Text>
              )}
            </View>
          )}

          {/* Enroll / Price */}
          {!isEnrolled ? (
            <TouchableOpacity
              style={[styles.enrollBtn, enroll.isPending && { opacity: 0.6 }]}
              onPress={() => enroll.mutate()}
              disabled={enroll.isPending}
              activeOpacity={0.8}
            >
              {enroll.isPending
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <Text style={styles.enrollBtnText}>
                    {course.isFree || course.is_free
                      ? 'Enroll Free'
                      : `Enroll · ₹${Number(course.price ?? 0).toLocaleString('en-IN')}`}
                  </Text>
              }
            </TouchableOpacity>
          ) : (
            <View style={styles.enrolledBadge}>
              <Text style={styles.enrolledBadgeText}>✓ Enrolled</Text>
            </View>
          )}
        </MotiView>

        {/* Modules */}
        {(course.modules ?? []).length > 0 && (
          <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 160, damping: 18 }}>
            <Text style={styles.sectionTitle}>Course Content</Text>
            {(course.modules ?? []).map((mod: any, mIdx: number) => {
              const isOpen = expanded.includes(mod.id);
              return (
                <View key={mod.id} style={styles.moduleCard}>
                  <TouchableOpacity style={styles.moduleHeader} onPress={() => toggleModule(mod.id)} activeOpacity={0.8}>
                    <Text style={styles.moduleNum}>{mIdx + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moduleTitle}>{mod.title}</Text>
                      <Text style={styles.moduleMeta}>{mod.lessons?.length ?? 0} lessons</Text>
                    </View>
                    <Text style={[styles.chevron, isOpen && { transform: [{ rotate: '180deg' }] }]}>›</Text>
                  </TouchableOpacity>

                  {isOpen && (mod.lessons ?? []).map((lesson: any, lIdx: number) => {
                    const icon = LESSON_ICON[lesson.type] ?? '📄';
                    const isLocked = !isEnrolled && !lesson.isPreview;
                    const link = lesson.contentUrl ?? lesson.content_url;
                    const meetLink = lesson.meetingLink ?? lesson.meeting_link;
                    return (
                      <TouchableOpacity
                        key={lesson.id}
                        style={[styles.lessonRow, isLocked && { opacity: 0.5 }]}
                        onPress={() => {
                          if (isLocked) { Alert.alert('Enroll to access', 'This lesson requires enrollment.'); return; }
                          const url = meetLink ?? link;
                          if (url) Linking.openURL(url);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.lessonIcon}>{isLocked ? '🔒' : icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lessonTitle}>{mIdx + 1}.{lIdx + 1} {lesson.title}</Text>
                          <View style={styles.lessonMeta}>
                            {lesson.duration && <Text style={styles.lessonMetaText}>{lesson.duration} min</Text>}
                            {lesson.isPreview && <Text style={[styles.lessonMetaText, { color: COLORS.green }]}>Free Preview</Text>}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </MotiView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 48 },

  header:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  backBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  backArrow: { ...FONTS.bold, fontSize: 22, color: COLORS.brand, marginTop: -2 },

  hero: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: 20, marginBottom: 20, ...SHADOW.md,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeTag:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  typeTagText: { ...FONTS.bold, fontSize: 10, letterSpacing: 0.5 },

  courseTitle: { ...FONTS.xbold, fontSize: 20, color: COLORS.text, marginBottom: 8 },
  instructor:  { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginBottom: 10 },
  courseDesc:  { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 19, marginBottom: 14 },

  metaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  metaChip: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },

  progressSection: { marginBottom: 16 },
  progressHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel:   { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted },
  progressPct:     { ...FONTS.bold, fontSize: 12, color: COLORS.brand },
  progressTrack:   { height: 6, backgroundColor: COLORS.surface, borderRadius: 3, overflow: 'hidden' },
  progressBar:     { height: '100%', backgroundColor: COLORS.brand, borderRadius: 3 },
  certNo:          { ...FONTS.medium, fontSize: 12, color: COLORS.gold, marginTop: 8 },

  enrollBtn: {
    backgroundColor: COLORS.brand, borderRadius: RADIUS.lg,
    padding: 14, alignItems: 'center', ...SHADOW.md,
  },
  enrollBtnText: { ...FONTS.bold, fontSize: 15, color: COLORS.white },
  enrolledBadge: {
    backgroundColor: COLORS.green + '22', borderRadius: RADIUS.lg,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.green + '44',
  },
  enrolledBadgeText: { ...FONTS.bold, fontSize: 14, color: COLORS.green },

  sectionTitle: { ...FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: 12 },
  moduleCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    marginBottom: 12, overflow: 'hidden', ...SHADOW.sm,
  },
  moduleHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
  },
  moduleNum:   { ...FONTS.bold, fontSize: 14, color: COLORS.brand, width: 24, textAlign: 'center' },
  moduleTitle: { ...FONTS.bold, fontSize: 14, color: COLORS.text },
  moduleMeta:  { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  chevron:     { ...FONTS.bold, fontSize: 20, color: COLORS.brand },

  lessonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: COLORS.cardBorder,
  },
  lessonIcon:  { fontSize: 16, width: 20, textAlign: 'center' },
  lessonTitle: { ...FONTS.medium, fontSize: 13, color: COLORS.text },
  lessonMeta:  { flexDirection: 'row', gap: 8, marginTop: 2 },
  lessonMetaText: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted },
});
