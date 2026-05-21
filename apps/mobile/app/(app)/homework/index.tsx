import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ScrollView, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { getHomeworkItems, submitHomeworkItem } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const FILTERS = ['all', 'pending', 'submitted', 'graded'];

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function HomeworkScreen() {
  const { user }  = useAuth();
  const router    = useRouter();
  const qc        = useQueryClient();
  const role      = user?.primaryRole ?? '';
  const canCreate = ['school_admin', 'principal', 'teacher'].includes(role);

  const [filter,     setFilter]     = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [title,      setTitle]      = useState('');
  const [subject,    setSubject]    = useState('');
  const [dueDate,    setDueDate]    = useState('');
  const [desc,       setDesc]       = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['homework', filter],
    queryFn: () => getHomeworkItems(filter !== 'all' ? `status=${filter}` : undefined),
  });

  const createMutation = useMutation({
    mutationFn: submitHomeworkItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homework'] });
      setShowForm(false);
      setTitle(''); setSubject(''); setDueDate(''); setDesc('');
      Alert.alert('Success', 'Homework assigned.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const items: any[] = data?.homework ?? data?.data ?? [];

  function renderItem({ item, index }: { item: any; index: number }) {
    const overdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'submitted';
    return (
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: index * 50, damping: 18 }}
      >
        <View style={[styles.card, overdue && styles.cardOverdue]}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hwTitle}>{item.title ?? item.homework_title ?? 'Homework'}</Text>
              <Text style={styles.hwSubject}>{item.subject ?? item.subject_name ?? ''}</Text>
            </View>
            {item.due_date && (
              <View style={[styles.dueBadge, overdue && styles.dueBadgeOverdue]}>
                <Text style={[styles.dueText, overdue && { color: COLORS.red ?? '#ef4444' }]}>
                  Due {formatDate(item.due_date)}
                </Text>
              </View>
            )}
          </View>
          {item.description && (
            <Text style={styles.hwDesc} numberOfLines={2}>{item.description}</Text>
          )}
          {item.class_name && (
            <Text style={styles.hwClass}>Class: {item.class_name}</Text>
          )}
        </View>
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
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Homework</Text>
        {canCreate ? (
          <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.8}>
            <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.fabGrad}>
              <Text style={styles.fabText}>+ New</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : <View style={{ width: 60 }} />}
      </MotiView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter(f); }}
          >
            <Text style={[styles.chipText, filter === f && { color: COLORS.white }]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📚</Text>
              <Text style={styles.emptyText}>No homework found</Text>
            </View>
          }
        />
      )}

      <Modal visible={showForm} animationType="none" transparent onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowForm(false)} />
          <AnimatePresence>
            {showForm && (
              <MotiView from={{ translateY: 600 }} animate={{ translateY: 0 }} exit={{ translateY: 600 }} transition={{ type: 'spring', damping: 22, stiffness: 200 }} style={styles.sheet}>
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>Assign Homework</Text>
                <Input label="Title" required value={title} onChangeText={setTitle} placeholder="e.g. Chapter 5 exercises" />
                <Input label="Subject" value={subject} onChangeText={setSubject} placeholder="Subject name" />
                <Input label="Due Date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
                <Input label="Description" value={desc} onChangeText={setDesc} placeholder="Instructions..." multiline numberOfLines={3} />
                <Button label="Assign" onPress={() => createMutation.mutate({ title, subject, due_date: dueDate, description: desc })} loading={createMutation.isPending} style={{ marginTop: 8 }} />
                <Button label="Cancel" variant="ghost" onPress={() => setShowForm(false)} style={{ marginTop: 8, marginBottom: 20 }} />
              </MotiView>
            )}
          </AnimatePresence>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  topBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:    { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  fab:     { borderRadius: RADIUS.md, overflow: 'hidden' },
  fabGrad: { paddingHorizontal: 16, paddingVertical: 10 },
  fabText: { ...FONTS.bold, color: COLORS.white, fontSize: 14 },
  filtersRow: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip:       { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.cardBorder },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText:   { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13 },
  list:    { padding: 20, paddingBottom: 40 },
  card:    { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardOverdue: { borderColor: '#ef444444' },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  hwTitle:   { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  hwSubject: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  hwDesc:    { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginTop: 4 },
  hwClass:   { ...FONTS.medium, fontSize: 12, color: COLORS.brand, marginTop: 6 },
  dueBadge:      { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  dueBadgeOverdue: { backgroundColor: '#ef444422' },
  dueText:       { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyText:  { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:   { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  handle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.cardBorder, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: 20 },
});
