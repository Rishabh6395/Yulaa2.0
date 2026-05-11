import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../src/context/AuthContext';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

type FeatureItem = {
  label: string;
  emoji: string;
  route: string;
  color: string;
  desc: string;
  roles: string[];
};

const ALL_FEATURES: FeatureItem[] = [
  {
    label: 'Online Classes',
    emoji: '🎥',
    route: '/(app)/online-classes',
    color: '#1A8CA5',
    desc: 'Live sessions & recordings',
    roles: ['teacher', 'student', 'parent', 'school_admin', 'principal', 'hod'],
  },
  {
    label: 'Courses',
    emoji: '📚',
    route: '/(app)/courses',
    color: '#7c3aed',
    desc: 'Browse & enroll in courses',
    roles: ['teacher', 'student', 'parent', 'school_admin', 'principal'],
  },
  {
    label: 'Career Sessions',
    emoji: '🎓',
    route: '/(app)/career-sessions',
    color: '#c9a566',
    desc: 'Book expert consultations',
    roles: ['parent', 'student', 'school_admin', 'principal'],
  },
  {
    label: 'Marketplace',
    emoji: '🛒',
    route: '/(app)/vendor',
    color: '#22c55e',
    desc: 'Buy school supplies',
    roles: ['parent', 'student', 'school_admin', 'principal'],
  },
  {
    label: 'My Orders',
    emoji: '📦',
    route: '/(app)/my-orders',
    color: '#f59e0b',
    desc: 'Track your orders',
    roles: ['parent', 'student'],
  },
  {
    label: 'My Courses',
    emoji: '🎯',
    route: '/(app)/my-courses',
    color: '#ec4899',
    desc: 'Continue your learning',
    roles: ['parent', 'student', 'teacher'],
  },
  {
    label: 'My Bookings',
    emoji: '📅',
    route: '/(app)/my-bookings',
    color: '#f97316',
    desc: 'Session history & ratings',
    roles: ['parent', 'student'],
  },
  {
    label: 'Manage Courses',
    emoji: '🏫',
    route: '/(app)/manage-courses',
    color: '#0ea5e9',
    desc: 'Build your course content',
    roles: ['teacher', 'school_admin', 'principal'],
  },
  {
    label: 'Manage Vendors',
    emoji: '🏪',
    route: '/(app)/manage-vendors',
    color: '#16a34a',
    desc: 'Vendor contracts & status',
    roles: ['school_admin', 'principal'],
  },
  {
    label: 'Manage Consultants',
    emoji: '👩‍💼',
    route: '/(app)/manage-consultants',
    color: '#9333ea',
    desc: 'Consultant contracts',
    roles: ['school_admin', 'principal'],
  },
];

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const role = user?.primaryRole ?? '';

  const features = ALL_FEATURES.filter(f => f.roles.includes(role));

  async function go(route: string) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <MotiView
          from={{ opacity: 0, translateY: -16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18 }}
          style={styles.header}
        >
          <Text style={styles.title}>More Features</Text>
          <Text style={styles.subtitle}>All available modules for your role</Text>
        </MotiView>

        <View style={styles.grid}>
          {features.map((f, i) => (
            <MotiView
              key={f.label}
              from={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: i * 55, damping: 16 }}
              style={styles.cardWrap}
            >
              <TouchableOpacity style={styles.card} onPress={() => go(f.route)} activeOpacity={0.75}>
                <LinearGradient
                  colors={[f.color + '33', f.color + '11']}
                  style={styles.iconBg}
                >
                  <Text style={styles.emoji}>{f.emoji}</Text>
                </LinearGradient>
                <Text style={styles.cardLabel}>{f.label}</Text>
                <Text style={styles.cardDesc} numberOfLines={1}>{f.desc}</Text>
              </TouchableOpacity>
            </MotiView>
          ))}
        </View>

        {/* Profile & Logout */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: features.length * 55 + 80, damping: 18 }}
          style={styles.bottomSection}
        >
          <TouchableOpacity style={styles.profileRow} onPress={() => go('/(app)/profile')} activeOpacity={0.8}>
            <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.name ?? 'U')[0].toUpperCase()}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileRole}>{role.replace(/_/g, ' ')}</Text>
            </View>
            <Text style={{ ...FONTS.medium, fontSize: 13, color: COLORS.brand }}>Edit →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 48 },

  header:   { marginBottom: 20 },
  title:    { ...FONTS.xbold, fontSize: 24, color: COLORS.text },
  subtitle: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 4 },

  grid:     { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cardWrap: { width: '50%', padding: 6 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    ...SHADOW.sm,
  },
  iconBg: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emoji:    { fontSize: 26 },
  cardLabel:{ ...FONTS.bold, fontSize: 14, color: COLORS.text, marginBottom: 3 },
  cardDesc: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },

  bottomSection: { marginTop: 24, gap: 12 },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    ...SHADOW.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText:  { ...FONTS.bold, color: COLORS.white, fontSize: 18 },
  profileName: { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  profileRole: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2, textTransform: 'capitalize' },

  logoutBtn: {
    backgroundColor: COLORS.red + '22',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.red + '44',
    padding: 14,
    alignItems: 'center',
  },
  logoutText: { ...FONTS.bold, fontSize: 14, color: COLORS.red },
});
