import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getTeacher } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function TeacherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['teacher', id],
    queryFn: () => getTeacher(id),
    enabled: !!id,
  });

  const teacher = data?.teacher ?? data;
  const name = teacher ? `${teacher.first_name ?? teacher.firstName ?? ''} ${teacher.last_name ?? teacher.lastName ?? ''}`.trim() || teacher.name : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          style={styles.backRow}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Teachers</Text>
        </TouchableOpacity>

        {isLoading ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : !teacher ? (
          <Text style={styles.notFound}>Teacher not found</Text>
        ) : (
          <>
            <MotiView
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 40, damping: 18 }}
              style={styles.profileCard}
            >
              <LinearGradient colors={[COLORS.gold + '22', COLORS.card]} style={styles.profileGrad}>
                <LinearGradient colors={[COLORS.gold, '#b8860b']} style={styles.avatar}>
                  <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
                <Text style={styles.teacherName}>{name}</Text>
                {teacher.designation && (
                  <Text style={styles.designation}>{teacher.designation}</Text>
                )}
                {teacher.subject && (
                  <View style={styles.subjectChip}>
                    <Text style={styles.subjectText}>{teacher.subject}</Text>
                  </View>
                )}
              </LinearGradient>
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 80, damping: 18 }}
              style={styles.infoCard}
            >
              <Text style={styles.cardTitle}>Contact Details</Text>
              <InfoRow label="Phone"       value={teacher.phone} />
              <InfoRow label="Email"       value={teacher.email} />
              <InfoRow label="Employee ID" value={teacher.employee_id ?? teacher.employeeId} />
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 120, damping: 18 }}
              style={styles.infoCard}
            >
              <Text style={styles.cardTitle}>Professional Details</Text>
              <InfoRow label="Designation"    value={teacher.designation} />
              <InfoRow label="Subject"        value={teacher.subject} />
              <InfoRow label="Qualification"  value={teacher.qualification} />
              <InfoRow label="Experience"     value={teacher.experience ? `${teacher.experience} years` : null} />
              <InfoRow label="Join Date"      value={teacher.join_date ?? teacher.joinDate} />
            </MotiView>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backArrow: { ...FONTS.bold, fontSize: 24, color: COLORS.brand, marginRight: 6 },
  backText:  { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  notFound:  { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted, textAlign: 'center', marginTop: 80 },

  profileCard: {
    borderRadius: RADIUS.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.cardBorder,
    marginBottom: 16, ...SHADOW.md,
  },
  profileGrad: { alignItems: 'center', padding: 28 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, ...SHADOW.md,
  },
  avatarText:   { ...FONTS.bold, fontSize: 30, color: COLORS.white },
  teacherName:  { ...FONTS.xbold, fontSize: 20, color: COLORS.text, marginBottom: 4 },
  designation:  { ...FONTS.medium, fontSize: 14, color: COLORS.textMuted, marginBottom: 10 },
  subjectChip: {
    backgroundColor: COLORS.brand + '22',
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  subjectText: { ...FONTS.bold, fontSize: 13, color: COLORS.brand },

  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl, borderWidth: 1,
    borderColor: COLORS.cardBorder, padding: 18,
    marginBottom: 14, ...SHADOW.sm,
  },
  cardTitle: { ...FONTS.bold, fontSize: 14, color: COLORS.text, marginBottom: 14 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  infoLabel: { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, flex: 1 },
  infoValue: { ...FONTS.medium, fontSize: 13, color: COLORS.text, flex: 2, textAlign: 'right' },
});
