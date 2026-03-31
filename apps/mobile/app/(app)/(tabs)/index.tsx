import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getDashboard, getEvents, getAnnouncements } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { StatCard } from '../../../src/components/ui/StatCard';
import { AnimatedCard } from '../../../src/components/ui/AnimatedCard';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const QUICK_ACTIONS = [
  { label: 'Admissions', emoji: '📋', route: '/(app)/admissions' },
  { label: 'Students',   emoji: '🎓', route: '/(app)/students' },
  { label: 'Fees',       emoji: '💰', route: '/(app)/fees' },
  { label: 'Leave',      emoji: '🗓️',  route: '/(app)/(tabs)/leave' },
  { label: 'Teachers',   emoji: '👩‍🏫', route: '/(app)/teachers' },
  { label: 'Events',     emoji: '📅', route: '/(app)/events' },
];

export default function DashboardScreen() {
  const { user } = useAuth();
  const router   = useRouter();

  const { data: dash, isLoading: dashLoading, refetch: refetchDash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });

  const { data: eventsData, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['events'],
    queryFn: getEvents,
  });

  const { data: announcementsData, isLoading: annLoading, refetch: refetchAnn } = useQuery({
    queryKey: ['announcements'],
    queryFn: getAnnouncements,
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchDash(), refetchEvents(), refetchAnn()]);
    setRefreshing(false);
  }, []);

  const stats = dash?.stats ?? {};
  const events = (eventsData?.events ?? []).slice(0, 3);
  const announcements = (announcementsData?.announcements ?? []).slice(0, 2);

  async function navigate(route: string) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.bg, '#0a1628']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brand}
            colors={[COLORS.brand]}
          />
        }
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 0, damping: 18 }}
          style={styles.header}
        >
          <View>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.userName}>{user?.name ?? 'Welcome'}</Text>
            <Text style={styles.userRole}>{user?.primaryRole?.replace(/_/g, ' ')}</Text>
          </View>
          <TouchableOpacity onPress={() => navigate('/(app)/profile')} activeOpacity={0.8}>
            <LinearGradient
              colors={[COLORS.brand, COLORS.brandDark]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {(user?.name ?? 'U').charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>

        {/* Stats grid */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 100, damping: 18 }}
          style={styles.sectionHeader}
        >
          <Text style={styles.sectionTitle}>Overview</Text>
        </MotiView>

        {dashLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard
              label="Students"
              value={stats.totalStudents ?? 0}
              sub="enrolled"
              color={COLORS.brand}
              index={0}
            />
            <StatCard
              label="Teachers"
              value={stats.totalTeachers ?? 0}
              sub="active"
              color={COLORS.gold}
              index={1}
            />
            <StatCard
              label="Attendance"
              value={stats.todayAttendance ? `${stats.todayAttendance}%` : '—'}
              sub="today"
              color={COLORS.green}
              index={2}
            />
            <StatCard
              label="Leaves"
              value={stats.pendingLeaves ?? 0}
              sub="pending"
              color={COLORS.amber}
              index={3}
            />
          </View>
        )}

        {/* Quick Actions */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 200, damping: 18 }}
          style={styles.sectionHeader}
        >
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </MotiView>

        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action, i) => (
            <MotiView
              key={action.label}
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 250 + i * 60, damping: 16 }}
              style={styles.quickWrap}
            >
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => navigate(action.route)}
                activeOpacity={0.75}
              >
                <Text style={styles.quickEmoji}>{action.emoji}</Text>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            </MotiView>
          ))}
        </View>

        {/* Today's Events */}
        {events.length > 0 && (
          <>
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 400, damping: 18 }}
              style={styles.sectionHeader}
            >
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
              <TouchableOpacity onPress={() => navigate('/(app)/events')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </MotiView>
            {events.map((ev: any, i: number) => (
              <AnimatedCard key={ev.id ?? i} delay={420} index={i}>
                <View style={styles.eventRow}>
                  <View style={styles.eventDateBox}>
                    <Text style={styles.eventDay}>
                      {new Date(ev.event_date ?? ev.date).getDate()}
                    </Text>
                    <Text style={styles.eventMonth}>
                      {new Date(ev.event_date ?? ev.date).toLocaleString('default', { month: 'short' })}
                    </Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{ev.title}</Text>
                    {ev.description && (
                      <Text style={styles.eventDesc} numberOfLines={1}>{ev.description}</Text>
                    )}
                  </View>
                </View>
              </AnimatedCard>
            ))}
          </>
        )}

        {/* Recent Announcements */}
        {announcements.length > 0 && (
          <>
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 500, damping: 18 }}
              style={styles.sectionHeader}
            >
              <Text style={styles.sectionTitle}>Recent Notices</Text>
              <TouchableOpacity onPress={() => navigate('/(app)/(tabs)/announcements')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </MotiView>
            {announcements.map((ann: any, i: number) => (
              <AnimatedCard key={ann.id ?? i} delay={520} index={i}>
                <Text style={styles.annTitle}>{ann.title}</Text>
                {ann.content && (
                  <Text style={styles.annContent} numberOfLines={2}>{ann.content}</Text>
                )}
              </AnimatedCard>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, letterSpacing: 0.3 },
  userName: { ...FONTS.xbold, fontSize: 22, color: COLORS.text, marginTop: 2 },
  userRole: {
    ...FONTS.regular,
    fontSize: 12,
    color: COLORS.brand,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.md,
  },
  avatarText: { ...FONTS.bold, color: COLORS.white, fontSize: 20 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: { ...FONTS.bold, fontSize: 16, color: COLORS.text },
  seeAll:       { ...FONTS.medium, fontSize: 13, color: COLORS.brand },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 8 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginBottom: 8 },
  quickWrap: { width: '33.33%', padding: 6 },
  quickBtn:  {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  quickEmoji: { fontSize: 26, marginBottom: 8 },
  quickLabel: { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },

  eventRow:    { flexDirection: 'row', alignItems: 'center' },
  eventDateBox: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.brand + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  eventDay:   { ...FONTS.bold, fontSize: 20, color: COLORS.brand },
  eventMonth: { ...FONTS.regular, fontSize: 11, color: COLORS.brand, marginTop: -2 },
  eventInfo:  { flex: 1 },
  eventTitle: { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  eventDesc:  { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 3 },

  annTitle:   { ...FONTS.bold, fontSize: 15, color: COLORS.text, marginBottom: 4 },
  annContent: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
});
