import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../src/context/AuthContext';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

interface Feature { label: string; emoji: string; route: string; roles: string[] }

const ALL_FEATURES: Feature[] = [
  // Academic
  { label: 'Homework',        emoji: '📚', route: '/(app)/homework',         roles: ['school_admin','principal','teacher','student','parent','hod'] },
  { label: 'Timetable',       emoji: '🗓️', route: '/(app)/timetable',         roles: ['school_admin','principal','teacher','student','parent','hod'] },
  { label: 'Syllabus',        emoji: '📖', route: '/(app)/syllabus',          roles: ['school_admin','principal','teacher','student','parent','hod'] },
  { label: 'Classes',         emoji: '🎒', route: '/(app)/classes',           roles: ['school_admin','principal','teacher','hod'] },
  { label: 'Online Classes',  emoji: '💻', route: '/(app)/online-classes',    roles: ['school_admin','principal','teacher','student','parent','hod'] },
  { label: 'Courses',         emoji: '🎓', route: '/(app)/courses',           roles: ['school_admin','principal','teacher','student','parent'] },
  { label: 'Scheduling',      emoji: '📅', route: '/(app)/scheduling',        roles: ['school_admin','principal'] },
  // Assessment
  { label: 'Exam',            emoji: '📝', route: '/(app)/exam',              roles: ['school_admin','principal','teacher','student','parent','hod'] },
  { label: 'Performance',     emoji: '📊', route: '/(app)/performance',       roles: ['school_admin','principal','teacher','parent','hod'] },
  // Communication
  { label: 'Queries',         emoji: '💬', route: '/(app)/queries',           roles: ['school_admin','principal','teacher','student','parent','hod','employee'] },
  { label: 'Year Book',       emoji: '📷', route: '/(app)/yearbook',          roles: ['school_admin','principal','teacher','student','parent','hod'] },
  // Operations
  { label: 'Transport',       emoji: '🚌', route: '/(app)/transport',         roles: ['school_admin','principal','parent'] },
  { label: 'Compliance',      emoji: '✅', route: '/(app)/compliance',        roles: ['school_admin','principal'] },
  { label: 'School Inventory',emoji: '📦', route: '/(app)/school-inventory',  roles: ['school_admin','principal'] },
  { label: 'Letter Templates',emoji: '📄', route: '/(app)/letter-templates',  roles: ['school_admin','principal'] },
  // External
  { label: 'Career Sessions', emoji: '🎯', route: '/(app)/career-sessions',   roles: ['school_admin','principal','parent','student'] },
  { label: 'Marketplace',     emoji: '🛒', route: '/(app)/vendor',            roles: ['school_admin','principal','parent','student'] },
  { label: 'My Contract',     emoji: '📃', route: '/(app)/contracts',         roles: ['vendor','consultant'] },
  // Consultant
  { label: 'My Sessions',     emoji: '🧑‍💼', route: '/(app)/consultant/sessions',    roles: ['consultant'] },
  { label: 'Availability',    emoji: '🕐', route: '/(app)/consultant/availability', roles: ['consultant'] },
  { label: 'Bookings',        emoji: '📌', route: '/(app)/consultant/bookings',     roles: ['consultant'] },
  // Vendor
  { label: 'My Products',     emoji: '🏷️', route: '/(app)/vendor/products',   roles: ['vendor'] },
  { label: 'Orders',          emoji: '📦', route: '/(app)/vendor/orders',     roles: ['vendor'] },
  { label: 'Ratings',         emoji: '⭐', route: '/(app)/vendor/ratings',    roles: ['vendor'] },
  // Super admin
  { label: 'School Library',      emoji: '🏫', route: '/(app)/schools',                        roles: ['super_admin'] },
  { label: 'Location Masters',    emoji: '🌐', route: '/(app)/super-admin/location-masters',    roles: ['super_admin'] },
  { label: 'School Defaults',     emoji: '⚙️', route: '/(app)/schools/default',                roles: ['super_admin'] },
  { label: 'All Consultants',     emoji: '🧑‍💼', route: '/(app)/super-admin/consultants',        roles: ['super_admin'] },
  { label: 'All Vendors',         emoji: '🛍️', route: '/(app)/super-admin/vendors',             roles: ['super_admin'] },
  { label: 'Class Config',        emoji: '🎥', route: '/(app)/super-admin/online-class-config', roles: ['super_admin'] },
  { label: 'Course Approvals',    emoji: '✔️', route: '/(app)/super-admin/courses',             roles: ['super_admin'] },
  { label: 'Admin Queries',       emoji: '❓', route: '/(app)/super-admin/queries',             roles: ['super_admin'] },
];

export default function MoreScreen() {
  const { user } = useAuth();
  const router   = useRouter();
  const role     = user?.primaryRole ?? '';

  const features = ALL_FEATURES.filter(f => f.roles.includes(role));

  async function navigate(route: string) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <LinearGradient colors={[COLORS.bg, '#0a1628']} style={StyleSheet.absoluteFill} />

      <MotiView
        from={{ opacity: 0, translateY: -16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 0, damping: 18 }}
        style={styles.header}
      >
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>{features.length} features available</Text>
      </MotiView>

      <FlatList
        data={features}
        keyExtractor={item => item.route}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: 12 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: index * 40, damping: 16 }}
            style={{ flex: 1 }}
          >
            <TouchableOpacity
              style={styles.tile}
              onPress={() => navigate(item.route)}
              activeOpacity={0.75}
            >
              <Text style={styles.tileEmoji}>{item.emoji}</Text>
              <Text style={styles.tileLabel}>{item.label}</Text>
            </TouchableOpacity>
          </MotiView>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>☰</Text>
            <Text style={styles.emptyText}>No additional features for your role</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: COLORS.bg },
  header:   { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title:    { ...FONTS.bold, fontSize: 24, color: COLORS.text },
  subtitle: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  grid:     { padding: 20, paddingBottom: 40, gap: 12 },
  tile: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  tileEmoji:  { fontSize: 26, marginBottom: 8 },
  tileLabel:  { ...FONTS.medium, fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyText:  { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted, textAlign: 'center' },
});
