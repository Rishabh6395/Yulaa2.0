import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getStudent, getAttendance, getFees } from '../../../src/api/client';
import { Badge } from '../../../src/components/ui/Badge';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const TABS = ['Overview', 'Attendance', 'Fees'];

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);

  const { data: studentData, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id),
    enabled: !!id,
  });

  const today = new Date();
  const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const { data: attData } = useQuery({
    queryKey: ['student-attendance', id, monthStr],
    queryFn: () => getAttendance(`type=student&student_id=${id}&month=${monthStr}`),
    enabled: !!id && activeTab === 1,
  });

  const { data: feesData } = useQuery({
    queryKey: ['student-fees', id],
    queryFn: () => getFees(`student_id=${id}`),
    enabled: !!id && activeTab === 2,
  });

  const student = studentData?.student ?? studentData;
  const name = student ? `${student.first_name ?? student.firstName ?? ''} ${student.last_name ?? student.lastName ?? ''}`.trim() || student.name : '';
  const attendance: any[] = attData?.attendance ?? attData?.records ?? [];
  const fees: any[] = feesData?.invoices ?? feesData?.fees ?? [];
  const presentCount = attendance.filter((a: any) => a.status === 'present').length;
  const rate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Back */}
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={styles.backRow}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Students</Text>
        </TouchableOpacity>

        {isLoading ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : !student ? (
          <Text style={styles.notFound}>Student not found</Text>
        ) : (
          <>
            {/* Profile header */}
            <MotiView
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 40, damping: 18 }}
              style={styles.profileCard}
            >
              <LinearGradient
                colors={[COLORS.brand + '22', COLORS.card]}
                style={styles.profileGrad}
              >
                <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.avatar}>
                  <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
                <Text style={styles.studentName}>{name}</Text>
                <Text style={styles.admNo}>
                  {[student.class_name ?? student.className, student.admission_no ? `#${student.admission_no}` : ''].filter(Boolean).join(' · ')}
                </Text>
                {student.status && (
                  <View style={{ marginTop: 10 }}>
                    <Badge status={student.status} />
                  </View>
                )}

                {/* Quick stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: COLORS.green }]}>{presentCount}</Text>
                    <Text style={styles.statLbl}>Present</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: COLORS.brand }]}>{rate}%</Text>
                    <Text style={styles.statLbl}>Att. Rate</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: COLORS.amber }]}>
                      {fees.filter((f: any) => f.status === 'pending' || f.status === 'overdue').length}
                    </Text>
                    <Text style={styles.statLbl}>Dues</Text>
                  </View>
                </View>
              </LinearGradient>
            </MotiView>

            {/* Tabs */}
            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 100, damping: 18 }}
              style={styles.tabsRow}
            >
              {TABS.map((tab, i) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === i && styles.tabActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(i); }}
                >
                  <Text style={[styles.tabText, activeTab === i && { color: COLORS.brand }]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </MotiView>

            {/* Tab content */}
            {activeTab === 0 && (
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 80, damping: 18 }}
              >
                <View style={styles.infoCard}>
                  <Text style={styles.cardTitle}>Personal Details</Text>
                  <InfoRow label="Full Name"    value={name} />
                  <InfoRow label="Date of Birth" value={student.dob ?? student.date_of_birth} />
                  <InfoRow label="Gender"       value={student.gender} />
                  <InfoRow label="Blood Group"  value={student.blood_group ?? student.bloodGroup} />
                  <InfoRow label="Phone"        value={student.phone} />
                  <InfoRow label="Email"        value={student.email} />
                  <InfoRow label="Address"      value={student.address} />
                </View>

                <View style={styles.infoCard}>
                  <Text style={styles.cardTitle}>Academic Info</Text>
                  <InfoRow label="Class"        value={student.class_name ?? student.className} />
                  <InfoRow label="Admission No" value={student.admission_no ?? student.admissionNo} />
                  <InfoRow label="Roll No"      value={String(student.roll_no ?? student.rollNo ?? '')} />
                  <InfoRow label="Academic Year" value={student.academic_year ?? student.academicYear} />
                </View>

                {(student.parent_name || student.mother_name || student.guardian_name) && (
                  <View style={styles.infoCard}>
                    <Text style={styles.cardTitle}>Parent / Guardian</Text>
                    <InfoRow label="Name"  value={student.parent_name ?? student.guardian_name} />
                    <InfoRow label="Phone" value={student.parent_phone ?? student.guardian_phone} />
                    <InfoRow label="Email" value={student.parent_email} />
                    <InfoRow label="Mother" value={student.mother_name} />
                  </View>
                )}
              </MotiView>
            )}

            {activeTab === 1 && (
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 80, damping: 18 }}
              >
                {attendance.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyEmoji}>📋</Text>
                    <Text style={styles.emptyText}>No attendance records this month</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.attSummary}>
                      <View style={[styles.attBadge, { backgroundColor: COLORS.green + '22', borderColor: COLORS.green + '55' }]}>
                        <Text style={[styles.attBadgeNum, { color: COLORS.green }]}>{presentCount}</Text>
                        <Text style={styles.attBadgeLbl}>Present</Text>
                      </View>
                      <View style={[styles.attBadge, { backgroundColor: COLORS.red + '22', borderColor: COLORS.red + '55' }]}>
                        <Text style={[styles.attBadgeNum, { color: COLORS.red }]}>
                          {attendance.filter((a: any) => a.status === 'absent').length}
                        </Text>
                        <Text style={styles.attBadgeLbl}>Absent</Text>
                      </View>
                      <View style={[styles.attBadge, { backgroundColor: COLORS.brand + '22', borderColor: COLORS.brand + '55' }]}>
                        <Text style={[styles.attBadgeNum, { color: COLORS.brand }]}>{rate}%</Text>
                        <Text style={styles.attBadgeLbl}>Rate</Text>
                      </View>
                    </View>
                    {attendance.slice(0, 20).map((rec: any, i: number) => (
                      <View key={rec.id ?? i} style={styles.attRow}>
                        <Text style={styles.attDate}>{rec.date ?? rec.attendance_date}</Text>
                        <View style={[
                          styles.attStatus,
                          { backgroundColor: rec.status === 'present' ? COLORS.green + '22' : COLORS.red + '22' },
                        ]}>
                          <Text style={[
                            styles.attStatusText,
                            { color: rec.status === 'present' ? COLORS.green : COLORS.red },
                          ]}>
                            {rec.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </MotiView>
            )}

            {activeTab === 2 && (
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 80, damping: 18 }}
              >
                {fees.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyEmoji}>💰</Text>
                    <Text style={styles.emptyText}>No fee records found</Text>
                  </View>
                ) : (
                  fees.map((inv: any, i: number) => (
                    <View key={inv.id ?? i} style={styles.feeCard}>
                      <View style={styles.feeTop}>
                        <Text style={styles.feeTitle}>{inv.description ?? inv.fee_type ?? 'Invoice'}</Text>
                        <Badge status={inv.status ?? 'pending'} />
                      </View>
                      <View style={styles.feeBottom}>
                        <Text style={styles.feeAmt}>₹{inv.amount ?? inv.total_amount}</Text>
                        {inv.due_date && <Text style={styles.feeDue}>Due: {new Date(inv.due_date).toLocaleDateString('en-IN')}</Text>}
                      </View>
                    </View>
                  ))
                )}
              </MotiView>
            )}
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
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
    ...SHADOW.md,
  },
  profileGrad: { alignItems: 'center', padding: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...SHADOW.md,
  },
  avatarText:  { ...FONTS.bold, fontSize: 30, color: COLORS.white },
  studentName: { ...FONTS.xbold, fontSize: 20, color: COLORS.text, marginBottom: 4 },
  admNo:       { ...FONTS.medium, fontSize: 13, color: COLORS.brand },

  statsRow:    { flexDirection: 'row', marginTop: 20, width: '100%', justifyContent: 'space-around' },
  statItem:    { alignItems: 'center' },
  statVal:     { ...FONTS.xbold, fontSize: 22 },
  statLbl:     { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  statDivider: { width: 1, backgroundColor: COLORS.cardBorder, height: 40 },

  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  tabActive: { backgroundColor: COLORS.brand + '22' },
  tabText:   { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted },

  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 18,
    marginBottom: 14,
    ...SHADOW.sm,
  },
  cardTitle: { ...FONTS.bold, fontSize: 14, color: COLORS.text, marginBottom: 14 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  infoLabel: { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, flex: 1 },
  infoValue: { ...FONTS.medium, fontSize: 13, color: COLORS.text, flex: 2, textAlign: 'right' },

  attSummary: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  attBadge: {
    flex: 1,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  attBadgeNum: { ...FONTS.xbold, fontSize: 22 },
  attBadgeLbl: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  attRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  attDate:       { ...FONTS.medium, fontSize: 14, color: COLORS.text },
  attStatus:     { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  attStatusText: { ...FONTS.bold, fontSize: 12, textTransform: 'capitalize' },

  feeCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 10,
    ...SHADOW.sm,
  },
  feeTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  feeTitle:  { ...FONTS.bold, fontSize: 14, color: COLORS.text, flex: 1, marginRight: 8 },
  feeBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeAmt:    { ...FONTS.xbold, fontSize: 18, color: COLORS.brand },
  feeDue:    { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },

  empty:      { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText:  { ...FONTS.medium, fontSize: 15, color: COLORS.textMuted },
});
