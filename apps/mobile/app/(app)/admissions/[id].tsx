import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getAdmissions, updateAdmissionStatus } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { Badge } from '../../../src/components/ui/Badge';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { Button } from '../../../src/components/ui/Button';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const WORKFLOW = ['submitted', 'under_review', 'approved', 'rejected'];

export default function AdmissionDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router   = useRouter();
  const qc       = useQueryClient();
  const isAdmin  = user?.primaryRole === 'admin' || user?.primaryRole === 'principal';

  const { data, isLoading } = useQuery({
    queryKey: ['admission', id],
    queryFn: () => getAdmissions(`id=${id}`),
    select: (d) => d?.applications?.[0] ?? d?.application ?? d,
  });

  const updateMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      updateAdmissionStatus(id, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['admission', id] });
      Alert.alert('Updated', 'Application status updated.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  async function handleAction(status: string) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      status === 'approved' ? 'Approve Application' : 'Reject Application',
      `Are you sure you want to ${status === 'approved' ? 'approve' : 'reject'} this application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: status === 'rejected' ? 'destructive' : 'default',
          onPress: () => updateMutation.mutate({ status }) },
      ]
    );
  }

  const app = data;
  const children: any[] = app?.children ?? app?.students ?? [];
  const currentStep = WORKFLOW.indexOf(app?.status ?? 'submitted');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Back button */}
        <MotiView
          from={{ opacity: 0, translateX: -16 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'spring', delay: 0, damping: 18 }}
          style={styles.backRow}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Admissions</Text>
          </TouchableOpacity>
        </MotiView>

        {isLoading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : !app ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Application not found</Text>
          </View>
        ) : (
          <>
            {/* Header */}
            <MotiView
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 60, damping: 18 }}
              style={styles.headerCard}
            >
              <LinearGradient
                colors={[COLORS.brand + '22', COLORS.brandDark + '11']}
                style={styles.headerGrad}
              >
                <View style={styles.headerRow}>
                  <LinearGradient
                    colors={[COLORS.brand, COLORS.brandDark]}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>
                      {(app.parent_name ?? app.applicant_name ?? 'A').charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.parentName}>{app.parent_name ?? app.applicant_name}</Text>
                    <Text style={styles.parentPhone}>{app.parent_phone ?? app.phone ?? ''}</Text>
                  </View>
                  <Badge status={app.status ?? 'submitted'} />
                </View>
              </LinearGradient>
            </MotiView>

            {/* Workflow steps */}
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 100, damping: 18 }}
              style={styles.workflowCard}
            >
              <Text style={styles.sectionTitle}>Application Status</Text>
              <View style={styles.workflowRow}>
                {WORKFLOW.filter(s => s !== 'rejected').map((step, i) => {
                  const isActive  = step === app?.status;
                  const isDone    = i <= currentStep && app?.status !== 'rejected';
                  const isRej     = app?.status === 'rejected';
                  return (
                    <View key={step} style={styles.workflowStep}>
                      <View style={[
                        styles.stepCircle,
                        isDone && !isRej  && { backgroundColor: COLORS.green },
                        isActive && isRej && { backgroundColor: COLORS.red },
                      ]}>
                        <Text style={styles.stepNum}>{isDone && !isRej ? '✓' : String(i + 1)}</Text>
                      </View>
                      <Text style={[styles.stepLabel, isDone && { color: COLORS.green }]}>
                        {step.replace(/_/g, '\n')}
                      </Text>
                      {i < WORKFLOW.filter(s => s !== 'rejected').length - 1 && (
                        <View style={[styles.stepLine, isDone && { backgroundColor: COLORS.green }]} />
                      )}
                    </View>
                  );
                })}
              </View>
            </MotiView>

            {/* Parent info */}
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 140, damping: 18 }}
              style={styles.infoCard}
            >
              <Text style={styles.sectionTitle}>Parent Details</Text>
              <InfoRow label="Name"   value={app.parent_name ?? app.applicant_name} />
              <InfoRow label="Phone"  value={app.parent_phone ?? app.phone} />
              <InfoRow label="Email"  value={app.parent_email ?? app.email} />
              <InfoRow label="Address" value={app.address} />
            </MotiView>

            {/* Children */}
            {children.length > 0 && (
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 180, damping: 18 }}
                style={styles.infoCard}
              >
                <Text style={styles.sectionTitle}>Children</Text>
                {children.map((child: any, ci: number) => (
                  <View key={ci} style={styles.childCard}>
                    <View style={styles.childRow}>
                      <View style={styles.childAvatar}>
                        <Text style={styles.childAvatarText}>
                          {(child.name ?? child.student_name ?? 'C').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.childName}>{child.name ?? child.student_name}</Text>
                        <Text style={styles.childClass}>Applying for: {child.applying_for_class ?? child.class ?? '—'}</Text>
                        {child.dob && <Text style={styles.childDob}>DOB: {child.dob}</Text>}
                      </View>
                    </View>
                  </View>
                ))}
              </MotiView>
            )}

            {/* Risk score */}
            {app.risk_score !== undefined && (
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 220, damping: 18 }}
                style={styles.infoCard}
              >
                <Text style={styles.sectionTitle}>Risk Assessment</Text>
                <View style={styles.riskRow}>
                  <Text style={styles.riskLabel}>Risk Score</Text>
                  <Text style={[
                    styles.riskValue,
                    { color: app.risk_score > 70 ? COLORS.red : app.risk_score > 40 ? COLORS.amber : COLORS.green },
                  ]}>
                    {app.risk_score}/100
                  </Text>
                </View>
                <View style={styles.riskBar}>
                  <View style={[
                    styles.riskFill,
                    {
                      width: `${app.risk_score}%`,
                      backgroundColor: app.risk_score > 70 ? COLORS.red : app.risk_score > 40 ? COLORS.amber : COLORS.green,
                    },
                  ]} />
                </View>
              </MotiView>
            )}

            {/* Admin actions */}
            {isAdmin && (app.status === 'submitted' || app.status === 'under_review') && (
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 260, damping: 18 }}
                style={styles.actionsCard}
              >
                <Button
                  label="Approve Application"
                  onPress={() => handleAction('approved')}
                  loading={updateMutation.isPending}
                  style={{ marginBottom: 10 }}
                />
                <Button
                  label="Reject Application"
                  variant="danger"
                  onPress={() => handleAction('rejected')}
                  disabled={updateMutation.isPending}
                />
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

  backRow: { marginBottom: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backArrow: { ...FONTS.bold, fontSize: 24, color: COLORS.brand, marginRight: 6 },
  backText:  { ...FONTS.medium, fontSize: 15, color: COLORS.brand },

  headerCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    marginBottom: 16,
    ...SHADOW.sm,
  },
  headerGrad: { padding: 18 },
  headerRow:  { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText:  { ...FONTS.bold, color: COLORS.white, fontSize: 22 },
  parentName:  { ...FONTS.bold, fontSize: 18, color: COLORS.text },
  parentPhone: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 3 },

  workflowCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 18,
    marginBottom: 16,
    ...SHADOW.sm,
  },
  workflowRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16, position: 'relative' },
  workflowStep: { flex: 1, alignItems: 'center', position: 'relative' },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 6,
    zIndex: 1,
  },
  stepNum:   { ...FONTS.bold, fontSize: 12, color: COLORS.white },
  stepLabel: { ...FONTS.medium, fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
  stepLine: {
    position: 'absolute',
    top: 16,
    left: '55%',
    right: '-55%',
    height: 2,
    backgroundColor: COLORS.surface,
  },

  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 18,
    marginBottom: 16,
    ...SHADOW.sm,
  },
  sectionTitle: { ...FONTS.bold, fontSize: 15, color: COLORS.text, marginBottom: 14 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  infoLabel: { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, flex: 1 },
  infoValue: { ...FONTS.medium, fontSize: 13, color: COLORS.text, flex: 2, textAlign: 'right' },

  childCard:      { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, marginBottom: 10 },
  childRow:       { flexDirection: 'row', alignItems: 'center' },
  childAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.gold + '33',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  childAvatarText: { ...FONTS.bold, fontSize: 16, color: COLORS.gold },
  childName:       { ...FONTS.bold, fontSize: 14, color: COLORS.text },
  childClass:      { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  childDob:        { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  riskRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  riskLabel:{ ...FONTS.medium, fontSize: 14, color: COLORS.textMuted },
  riskValue:{ ...FONTS.bold, fontSize: 16 },
  riskBar:  { height: 8, backgroundColor: COLORS.surface, borderRadius: 4, overflow: 'hidden' },
  riskFill: { height: '100%', borderRadius: 4 },

  actionsCard: { marginBottom: 20 },

  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyText:  { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
