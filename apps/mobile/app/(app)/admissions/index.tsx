import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getAdmissions, submitAdmission } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { Badge } from '../../../src/components/ui/Badge';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const STATUSES = ['all', 'submitted', 'under_review', 'approved', 'rejected'];

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdmissionsScreen() {
  const { user } = useAuth();
  const router   = useRouter();
  const qc       = useQueryClient();
  const [search,      setSearch]      = useState('');
  const [statusFilter, setStatus]     = useState('all');
  const [refreshing,  setRefreshing]  = useState(false);
  const [showForm,    setShowForm]    = useState(false);

  // Form state
  const [parentName,  setParentName]  = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [childName,   setChildName]   = useState('');
  const [childDob,    setChildDob]    = useState('');
  const [applyClass,  setApplyClass]  = useState('');
  const [address,     setAddress]     = useState('');
  const [notes,       setNotes]       = useState('');

  const params = statusFilter !== 'all' ? `status=${statusFilter}` : undefined;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admissions', statusFilter],
    queryFn: () => getAdmissions(params),
  });

  const submitMutation = useMutation({
    mutationFn: submitAdmission,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admissions'] });
      setShowForm(false);
      resetForm();
      Alert.alert('Success', 'Application submitted successfully.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  function resetForm() {
    setParentName(''); setParentPhone(''); setParentEmail('');
    setChildName(''); setChildDob(''); setApplyClass('');
    setAddress(''); setNotes('');
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const applications: any[] = data?.applications ?? data?.data ?? [];
  const filtered = applications.filter((a: any) => {
    const q = search.toLowerCase();
    return !q || (a.parent_name ?? '').toLowerCase().includes(q) || (a.applicant_name ?? '').toLowerCase().includes(q);
  });

  async function handleSubmit() {
    if (!parentName.trim() || !parentPhone.trim() || !childName.trim()) {
      Alert.alert('Validation', 'Parent name, phone and child name are required.');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    submitMutation.mutate({
      parent_name: parentName,
      parent_phone: parentPhone,
      parent_email: parentEmail,
      children: [{ name: childName, dob: childDob, applying_for_class: applyClass }],
      address,
      notes,
    });
  }

  function renderItem({ item, index }: { item: any; index: number }) {
    const children: any[] = item.children ?? item.students ?? [];
    return (
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: index * 60, damping: 18 }}
      >
        <TouchableOpacity
          style={styles.appCard}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/(app)/admissions/${item.id}`);
          }}
          activeOpacity={0.75}
        >
          <View style={styles.cardTop}>
            <View style={styles.cardAvatar}>
              <Text style={styles.cardAvatarText}>
                {(item.parent_name ?? item.applicant_name ?? 'A').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.parent_name ?? item.applicant_name ?? 'Applicant'}</Text>
              <Text style={styles.cardPhone}>{item.parent_phone ?? item.phone ?? ''}</Text>
            </View>
            <Badge status={item.status ?? 'submitted'} />
          </View>
          {children.length > 0 && (
            <View style={styles.childrenRow}>
              {children.slice(0, 3).map((c: any, ci: number) => (
                <View key={ci} style={styles.childChip}>
                  <Text style={styles.childChipText}>{c.name ?? c.student_name} · {c.applying_for_class ?? c.class}</Text>
                </View>
              ))}
              {children.length > 3 && (
                <View style={styles.childChip}>
                  <Text style={styles.childChipText}>+{children.length - 3} more</Text>
                </View>
              )}
            </View>
          )}
          <Text style={styles.cardDate}>Applied: {formatDate(item.created_at ?? item.submitted_at)}</Text>
        </TouchableOpacity>
      </MotiView>
    );
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
        <Text style={styles.screenTitle}>Admissions</Text>
        <TouchableOpacity
          style={styles.fabBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowForm(true); }}
          activeOpacity={0.8}
        >
          <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.fabGrad}>
            <Text style={styles.fabText}>+ New</Text>
          </LinearGradient>
        </TouchableOpacity>
      </MotiView>

      {/* Search */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 60, damping: 18 }}
        style={styles.searchWrap}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by parent name..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </MotiView>

      {/* Status filters */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', delay: 100 }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {STATUSES.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStatus(s); }}
            >
              <Text style={[styles.filterChipText, statusFilter === s && { color: COLORS.white }]}>
                {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />
          }
          ListEmptyComponent={
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 120, damping: 16 }}
              style={styles.emptyState}
            >
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyText}>No applications found</Text>
            </MotiView>
          }
        />
      )}

      {/* New Application Modal */}
      <Modal visible={showForm} animationType="none" transparent onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowForm(false)} />
          <AnimatePresence>
            {showForm && (
              <MotiView
                from={{ translateY: 700 }}
                animate={{ translateY: 0 }}
                exit={{ translateY: 700 }}
                transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                style={styles.bottomSheet}
              >
                <View style={styles.sheetHandle} />
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.sheetTitle}>New Application</Text>
                  <Text style={styles.sheetSection}>Parent Information</Text>
                  <Input label="Parent / Guardian Name" required value={parentName} onChangeText={setParentName} placeholder="Full name" />
                  <Input label="Phone Number" required value={parentPhone} onChangeText={setParentPhone} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" />
                  <Input label="Email Address" value={parentEmail} onChangeText={setParentEmail} placeholder="email@example.com" keyboardType="email-address" />
                  <Input label="Address" value={address} onChangeText={setAddress} placeholder="Residential address" multiline numberOfLines={2} />

                  <Text style={styles.sheetSection}>Child Information</Text>
                  <Input label="Child's Full Name" required value={childName} onChangeText={setChildName} placeholder="Child's name" />
                  <Input label="Date of Birth" value={childDob} onChangeText={setChildDob} placeholder="YYYY-MM-DD" />
                  <Input label="Applying for Class" value={applyClass} onChangeText={setApplyClass} placeholder="e.g. Grade 1, KG" />
                  <Input label="Additional Notes" value={notes} onChangeText={setNotes} placeholder="Any special requirements..." multiline numberOfLines={2} />

                  <Button
                    label="Submit Application"
                    onPress={handleSubmit}
                    loading={submitMutation.isPending}
                    style={{ marginTop: 8 }}
                  />
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onPress={() => setShowForm(false)}
                    style={{ marginTop: 8, marginBottom: 20 }}
                  />
                </ScrollView>
              </MotiView>
            )}
          </AnimatePresence>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  screenTitle: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  fabBtn:  { borderRadius: RADIUS.md, overflow: 'hidden' },
  fabGrad: { paddingHorizontal: 16, paddingVertical: 10 },
  fabText: { ...FONTS.bold, color: COLORS.white, fontSize: 14 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, color: COLORS.text, fontSize: 15 },

  filtersRow: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  filterChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  filterChipActive:  { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  filterChipText:    { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13, textTransform: 'capitalize' },

  list:       { padding: 20, paddingBottom: 40 },
  appCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 12,
    ...SHADOW.sm,
  },
  cardTop:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.brand + '33',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardAvatarText: { ...FONTS.bold, fontSize: 18, color: COLORS.brand },
  cardName:       { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  cardPhone:      { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  childrenRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  childChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  childChipText:  { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted },
  cardDate:       { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },

  emptyState:     { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:     { fontSize: 48, marginBottom: 14 },
  emptyText:      { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },

  modalOverlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  bottomSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 0,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    maxHeight: '92%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.cardBorder,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle:   { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: 20 },
  sheetSection: { ...FONTS.bold, fontSize: 14, color: COLORS.brand, marginBottom: 14, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
});
