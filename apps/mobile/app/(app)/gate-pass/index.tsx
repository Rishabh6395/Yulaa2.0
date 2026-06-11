import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, Modal, Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView, AnimatePresence } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getGatePasses, issueGatePass, updateGatePass, getStudents } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { Button } from '../../../src/components/ui/Button';
import { useAuth } from '../../../src/context/AuthContext';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const STATUS_COLOR: Record<string, string> = {
  issued:           '#f59e0b',
  parent_consented: '#3b82f6',
  returned:         '#10b981',
};

function fmt(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function GatePassScreen() {
  const router   = useRouter();
  const { user } = useAuth();
  const qc       = useQueryClient();
  const isAdmin  = ['school_admin', 'principal', 'teacher', 'hod'].includes(user?.primaryRole ?? '');

  const [refreshing, setRefreshing]       = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showVerify, setShowVerify]       = useState<any>(null);

  // Issue form state
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [reason, setReason]               = useState('');
  const [showStudentList, setShowStudentList] = useState(false);

  // Verify OTP state
  const [otp, setOtp] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['gate-passes'],
    queryFn: () => getGatePasses(),
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students-search', studentSearch],
    queryFn: () => getStudents(studentSearch ? `search=${studentSearch}` : undefined),
    enabled: isAdmin && showStudentList,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const issueMutation = useMutation({
    mutationFn: issueGatePass,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gate-passes'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowIssueForm(false);
      setSelectedStudent(null);
      setReason('');
      Alert.alert('Gate Pass Issued', 'The gate pass has been created. Share the OTP with the parent.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => updateGatePass(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gate-passes'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowVerify(null);
      setOtp('');
      Alert.alert('Verified', 'Parent consent recorded.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const markReturnedMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => updateGatePass(id, { action: 'return' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gate-passes'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const passes: any[] = data?.gatePasses ?? data?.gate_passes ?? data?.data ?? [];
  const students: any[] = studentsData?.students ?? studentsData?.data ?? [];

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
        <Text style={styles.screenTitle}>Gate Pass</Text>
        {isAdmin ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowIssueForm(true); }}
          >
            <Text style={styles.addBtnText}>+ Issue</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 60 }} />}
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={passes}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          renderItem={({ item, index }) => {
            const statusColor = STATUS_COLOR[item.status ?? 'issued'] ?? COLORS.textMuted;
            const studentName = item.student
              ? `${item.student.firstName ?? ''} ${item.student.lastName ?? ''}`.trim()
              : item.studentName ?? 'Student';
            return (
              <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{studentName}</Text>
                      <Text style={styles.classMeta}>{item.student?.class?.name ?? ''}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
                      <Text style={[styles.badgeText, { color: statusColor }]}>
                        {(item.status ?? 'issued').replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>

                  {item.reason && <Text style={styles.reason}>Reason: {item.reason}</Text>}
                  <Text style={styles.time}>Issued: {fmt(item.createdAt ?? item.created_at)}</Text>

                  {item.status === 'issued' && isAdmin && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowVerify(item); }}
                      >
                        <Text style={styles.actionBtnText}>Verify OTP</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {item.status === 'parent_consented' && isAdmin && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: COLORS.green + '22', borderColor: COLORS.green }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          markReturnedMutation.mutate({ id: item.id });
                        }}
                      >
                        <Text style={[styles.actionBtnText, { color: COLORS.green }]}>Mark Returned</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </MotiView>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🚪</Text>
              <Text style={styles.emptyTitle}>No Gate Passes</Text>
              <Text style={styles.emptySubtitle}>{isAdmin ? 'Issue a gate pass using the button above.' : 'No gate passes issued today.'}</Text>
            </View>
          }
        />
      )}

      {/* Issue Gate Pass Modal */}
      <Modal visible={showIssueForm} animationType="none" transparent onRequestClose={() => setShowIssueForm(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowIssueForm(false)} />
          <AnimatePresence>
            {showIssueForm && (
              <MotiView from={{ translateY: 500 }} animate={{ translateY: 0 }} exit={{ translateY: 500 }} transition={{ type: 'spring', damping: 22, stiffness: 200 }} style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Issue Gate Pass</Text>

                <Text style={styles.fieldLabel}>Search Student</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type student name..."
                  placeholderTextColor={COLORS.textMuted}
                  value={selectedStudent ? `${selectedStudent.firstName ?? ''} ${selectedStudent.lastName ?? ''}`.trim() : studentSearch}
                  onChangeText={t => { setStudentSearch(t); setSelectedStudent(null); setShowStudentList(true); }}
                  onFocus={() => setShowStudentList(true)}
                />

                {showStudentList && students.length > 0 && !selectedStudent && (
                  <View style={styles.dropdown}>
                    {students.slice(0, 5).map((s: any) => (
                      <TouchableOpacity
                        key={s.id}
                        style={styles.dropdownItem}
                        onPress={() => { setSelectedStudent(s); setShowStudentList(false); Haptics.selectionAsync(); }}
                      >
                        <Text style={styles.dropdownText}>{s.firstName} {s.lastName} · {s.class?.name ?? ''}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Reason</Text>
                <TextInput
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder="Reason for gate pass..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  value={reason}
                  onChangeText={setReason}
                />

                <Button
                  label="Issue Gate Pass"
                  onPress={() => {
                    if (!selectedStudent) { Alert.alert('Select a student first'); return; }
                    issueMutation.mutate({ studentId: selectedStudent.id, reason });
                  }}
                  loading={issueMutation.isPending}
                />
                <Button label="Cancel" variant="ghost" onPress={() => setShowIssueForm(false)} />
              </MotiView>
            )}
          </AnimatePresence>
        </KeyboardAvoidingView>
      </Modal>

      {/* Verify OTP Modal */}
      <Modal visible={!!showVerify} animationType="none" transparent onRequestClose={() => setShowVerify(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowVerify(null)} />
          <AnimatePresence>
            {!!showVerify && (
              <MotiView from={{ translateY: 500 }} animate={{ translateY: 0 }} exit={{ translateY: 500 }} transition={{ type: 'spring', damping: 22, stiffness: 200 }} style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Verify Parent OTP</Text>
                <Text style={styles.verifySubtitle}>Enter the 6-digit OTP shared by the parent</Text>

                <TextInput
                  style={[styles.textInput, { textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
                  placeholder="------"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                />

                <Button
                  label="Verify"
                  onPress={() => {
                    if (otp.length !== 6) { Alert.alert('Enter a 6-digit OTP'); return; }
                    verifyMutation.mutate({ id: showVerify.id, body: { action: 'verify', otp } });
                  }}
                  loading={verifyMutation.isPending}
                />
                <Button label="Cancel" variant="ghost" onPress={() => { setShowVerify(null); setOtp(''); }} />
              </MotiView>
            )}
          </AnimatePresence>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.bg },
  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:           { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle:    { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  addBtn:         { backgroundColor: COLORS.brand, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText:     { ...FONTS.bold, fontSize: 13, color: COLORS.white },
  list:           { padding: 20, paddingBottom: 40 },
  card:           { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardRow:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  studentName:    { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  classMeta:      { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  badge:          { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:      { ...FONTS.bold, fontSize: 12, textTransform: 'capitalize' },
  reason:         { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  time:           { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  actionRow:      { flexDirection: 'row', marginTop: 10, gap: 10 },
  actionBtn:      { borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, backgroundColor: COLORS.brand + '22', borderColor: COLORS.brand },
  actionBtnText:  { ...FONTS.bold, fontSize: 13, color: COLORS.brand },
  overlay:        { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:          { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: COLORS.cardBorder },
  sheetHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.cardBorder, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:     { ...FONTS.bold, fontSize: 18, color: COLORS.text, marginBottom: 16 },
  fieldLabel:     { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginBottom: 6 },
  textInput:      { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.cardBorder, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 15, marginBottom: 12 },
  dropdown:       { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: 12, overflow: 'hidden' },
  dropdownItem:   { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  dropdownText:   { ...FONTS.regular, fontSize: 14, color: COLORS.text },
  verifySubtitle: { ...FONTS.regular, fontSize: 14, color: COLORS.textMuted, marginBottom: 16 },
  emptyState:     { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyEmoji:     { fontSize: 48, marginBottom: 14 },
  emptyTitle:     { ...FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: 6 },
  emptySubtitle:  { ...FONTS.regular, fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
