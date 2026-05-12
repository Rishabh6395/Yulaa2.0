import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Linking, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { getOnlineClasses, updateOnlineClass } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const PLATFORMS: Record<string, { label: string; color: string }> = {
  meet:  { label: 'Google Meet', color: '#1A73E8' },
  teams: { label: 'Microsoft Teams', color: '#6264A7' },
  zoom:  { label: 'Zoom', color: '#2D8CFF' },
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  scheduled: { bg: COLORS.amber + '22', text: COLORS.amber, label: 'Scheduled' },
  live:      { bg: COLORS.red + '22',   text: COLORS.red,   label: '● LIVE' },
  ended:     { bg: COLORS.surface,      text: COLORS.textMuted, label: 'Ended' },
  cancelled: { bg: COLORS.surface,      text: COLORS.textMuted, label: 'Cancelled' },
};

export default function OnlineClassesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const role = user?.primaryRole ?? '';
  const isTeacher = role === 'teacher';
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['online-classes', filter],
    queryFn: () => getOnlineClasses(filter === 'upcoming' ? 'upcoming=true' : ''),
  });

  const classes: any[] = data?.classes ?? [];
  const displayed = filter === 'past'
    ? classes.filter(c => c.status === 'ended' || c.status === 'cancelled').sort((a, b) => new Date(b.scheduledAt ?? b.scheduled_at).getTime() - new Date(a.scheduledAt ?? a.scheduled_at).getTime())
    : classes;

  const patchClass = useMutation({
    mutationFn: updateOnlineClass,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['online-classes'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  function formatTime(dt: string) {
    return new Date(dt).toLocaleString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />}
      >
        {/* Header */}
        <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', damping: 18 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Online Classes</Text>
            <Text style={styles.subtitle}>{isTeacher ? 'Your scheduled sessions' : 'Your class sessions'}</Text>
          </View>
          {isTeacher && (
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(app)/online-classes/create' as any)} activeOpacity={0.8}>
              <Text style={styles.addBtnText}>+ Create</Text>
            </TouchableOpacity>
          )}
        </MotiView>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {(['upcoming', 'past'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'upcoming' ? 'Upcoming' : 'Past'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        {isLoading ? (
          <>{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</>
        ) : displayed.length === 0 ? (
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 300 }} style={styles.empty}>
            <Text style={styles.emptyIcon}>🎥</Text>
            <Text style={styles.emptyTitle}>No classes {filter === 'upcoming' ? 'scheduled' : 'found'}</Text>
            <Text style={styles.emptySubtitle}>{isTeacher ? 'Create a class to get started.' : 'Check back later.'}</Text>
          </MotiView>
        ) : (
          displayed.map((cls: any, i: number) => {
            const scheduledAt = cls.scheduledAt ?? cls.scheduled_at;
            const status = cls.status ?? 'scheduled';
            const ss = STATUS_STYLE[status] ?? STATUS_STYLE.scheduled;
            const plat = PLATFORMS[cls.platform] ?? { label: cls.platform, color: COLORS.brand };
            const link = cls.meetingLink ?? cls.meeting_link;
            const rec  = cls.recordingUrl ?? cls.recording_url;

            return (
              <MotiView
                key={cls.id}
                from={{ opacity: 0, translateX: -16 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'spring', delay: i * 60, damping: 18 }}
                style={styles.card}
              >
                {/* Status badge */}
                <View style={styles.cardTop}>
                  <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                    <Text style={[styles.statusText, { color: ss.text }]}>{ss.label}</Text>
                  </View>
                  <View style={[styles.platBadge, { backgroundColor: plat.color + '22' }]}>
                    <Text style={[styles.platText, { color: plat.color }]}>{plat.label}</Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>{cls.title}</Text>
                {cls.subject && <Text style={styles.cardSubject}>{cls.subject}</Text>}

                <Text style={styles.cardTime}>{formatTime(scheduledAt)}</Text>
                <Text style={styles.cardMeta}>
                  {cls.durationMinutes ?? cls.duration_minutes ?? 45} min
                  {cls.class?.name ? ` · ${cls.class.name}` : ''}
                  {cls.teacher?.user ? ` · ${cls.teacher.user.firstName} ${cls.teacher.user.lastName}` : ''}
                </Text>

                {/* Attendance count (teacher/admin) */}
                {cls.attendances && (
                  <Text style={styles.attendanceCount}>
                    👥 {cls.attendances.filter((a: any) => a.status === 'present').length} / {cls.attendances.length} present
                  </Text>
                )}

                {/* Actions */}
                <View style={styles.cardActions}>
                  {link && (status === 'live' || status === 'scheduled') && (
                    <TouchableOpacity
                      style={[styles.joinBtn, { backgroundColor: plat.color }]}
                      onPress={() => Linking.openURL(link)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.joinBtnText}>Join</Text>
                    </TouchableOpacity>
                  )}
                  {isTeacher && status === 'scheduled' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: COLORS.red + '22', borderColor: COLORS.red + '44' }]}
                      onPress={() => patchClass.mutate({ id: cls.id, status: 'live' })}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.actionBtnText, { color: COLORS.red }]}>Start</Text>
                    </TouchableOpacity>
                  )}
                  {isTeacher && status === 'live' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: COLORS.surface, borderColor: COLORS.cardBorder }]}
                        onPress={() => router.push(`/(app)/online-classes/${cls.id}/attendance` as any)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.actionBtnText, { color: COLORS.text }]}>Attendance</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: COLORS.surface, borderColor: COLORS.cardBorder }]}
                        onPress={() => patchClass.mutate({ id: cls.id, status: 'ended' })}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.actionBtnText, { color: COLORS.textMuted }]}>End</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {rec && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: COLORS.brand + '22', borderColor: COLORS.brand + '44' }]}
                      onPress={() => Linking.openURL(rec)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.actionBtnText, { color: COLORS.brand }]}>▶ Recording</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </MotiView>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 48 },

  header:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  backArrow: { ...FONTS.bold, fontSize: 22, color: COLORS.brand, marginTop: -2 },
  title:    { ...FONTS.xbold, fontSize: 22, color: COLORS.text },
  subtitle: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  addBtn:   { backgroundColor: COLORS.brand, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.lg },
  addBtnText: { ...FONTS.bold, fontSize: 13, color: COLORS.white },

  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  filterBtn: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: COLORS.brand + '22', borderColor: COLORS.brand + '66' },
  filterText: { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  filterTextActive: { color: COLORS.brand },

  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: 16, marginBottom: 14, ...SHADOW.sm,
  },
  cardTop:     { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  statusText:  { ...FONTS.bold, fontSize: 11 },
  platBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  platText:    { ...FONTS.medium, fontSize: 11 },

  cardTitle:   { ...FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: 3 },
  cardSubject: { ...FONTS.medium, fontSize: 13, color: COLORS.brand, marginBottom: 8 },
  cardTime:    { ...FONTS.medium, fontSize: 13, color: COLORS.text },
  cardMeta:    { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2, marginBottom: 6 },
  attendanceCount: { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, marginBottom: 8 },

  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  joinBtn: {
    paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: RADIUS.lg, alignItems: 'center',
  },
  joinBtnText: { ...FONTS.bold, fontSize: 13, color: COLORS.white },
  actionBtn: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: RADIUS.lg, borderWidth: 1, alignItems: 'center',
  },
  actionBtnText: { ...FONTS.bold, fontSize: 12 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon:     { fontSize: 44 },
  emptyTitle:    { ...FONTS.bold, fontSize: 16, color: COLORS.textMuted },
  emptySubtitle: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted + 'aa', textAlign: 'center' },
});
