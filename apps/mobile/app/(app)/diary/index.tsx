import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, Modal, Alert, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView, AnimatePresence } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getDiaryEntries, createDiaryEntry, getClasses } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { Button } from '../../../src/components/ui/Button';
import { useAuth } from '../../../src/context/AuthContext';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DiaryScreen() {
  const router   = useRouter();
  const { user } = useAuth();
  const qc       = useQueryClient();
  const isTeacher = ['teacher', 'school_admin', 'principal', 'hod'].includes(user?.primaryRole ?? '');

  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [classFilter, setClassFilter] = useState<string | null>(null);

  // Form state
  const [selectedClass, setSelectedClass] = useState('');
  const [subject, setSubject]             = useState('');
  const [topic, setTopic]                 = useState('');
  const [notes, setNotes]                 = useState('');
  const [diaryDate, setDiaryDate]         = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['diary', classFilter],
    queryFn: () => getDiaryEntries(classFilter ? `classId=${classFilter}` : undefined),
  });

  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: getClasses });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const createMutation = useMutation({
    mutationFn: createDiaryEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diary'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowForm(false);
      setSubject(''); setTopic(''); setNotes('');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const entries: any[] = data?.entries ?? data?.diary ?? data?.data ?? [];
  const classes: any[] = classesData?.classes ?? classesData?.data ?? [];

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
        <Text style={styles.screenTitle}>Class Diary</Text>
        {isTeacher ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowForm(true); }}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 60 }} />}
      </MotiView>

      {classes.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          <TouchableOpacity style={[styles.chip, !classFilter && styles.chipActive]} onPress={() => setClassFilter(null)}>
            <Text style={[styles.chipText, !classFilter && { color: COLORS.white }]}>All</Text>
          </TouchableOpacity>
          {classes.map((c: any) => (
            <TouchableOpacity key={c.id} style={[styles.chip, classFilter === c.id && styles.chipActive]} onPress={() => setClassFilter(c.id)}>
              <Text style={[styles.chipText, classFilter === c.id && { color: COLORS.white }]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.subjectBadge}>
                    <Text style={styles.subjectText}>{item.subject ?? item.subjectName ?? '—'}</Text>
                  </View>
                  <Text style={styles.dateText}>{fmtDate(item.date ?? item.diaryDate ?? item.created_at)}</Text>
                </View>
                {(item.topic ?? item.title) && <Text style={styles.topic}>{item.topic ?? item.title}</Text>}
                {item.className && <Text style={styles.classMeta}>🎒 {item.className}</Text>}
                {(item.notes ?? item.description ?? item.content) && (
                  <Text style={styles.notes} numberOfLines={3}>{item.notes ?? item.description ?? item.content}</Text>
                )}
                {item.teacherName && <Text style={styles.teacher}>👩‍🏫 {item.teacherName}</Text>}
              </View>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📓</Text>
              <Text style={styles.emptyTitle}>No Diary Entries</Text>
              <Text style={styles.emptySubtitle}>{isTeacher ? 'Log today\'s class activity using the + Add button.' : 'No diary entries for your class yet.'}</Text>
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
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Add Diary Entry</Text>

                <Text style={styles.fieldLabel}>Class</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {classes.map((c: any) => (
                      <TouchableOpacity key={c.id} style={[styles.chip, selectedClass === c.id && styles.chipActive]} onPress={() => { setSelectedClass(c.id); Haptics.selectionAsync(); }}>
                        <Text style={[styles.chipText, selectedClass === c.id && { color: COLORS.white }]}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={styles.fieldLabel}>Subject</Text>
                <TextInput style={styles.textInput} placeholder="e.g. Mathematics" placeholderTextColor={COLORS.textMuted} value={subject} onChangeText={setSubject} />

                <Text style={styles.fieldLabel}>Topic Covered</Text>
                <TextInput style={styles.textInput} placeholder="e.g. Quadratic Equations" placeholderTextColor={COLORS.textMuted} value={topic} onChangeText={setTopic} />

                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder="Additional notes, homework assigned..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline value={notes} onChangeText={setNotes}
                />

                <Button
                  label="Save Entry"
                  onPress={() => {
                    if (!selectedClass || !subject) { Alert.alert('Select class and subject'); return; }
                    createMutation.mutate({ classId: selectedClass, subject, topic, notes, date: diaryDate });
                  }}
                  loading={createMutation.isPending}
                />
                <Button label="Cancel" variant="ghost" onPress={() => setShowForm(false)} />
              </MotiView>
            )}
          </AnimatePresence>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.bg },
  topBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:          { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle:   { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  addBtn:        { backgroundColor: COLORS.brand, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText:    { ...FONTS.bold, fontSize: 13, color: COLORS.white },
  filtersRow:    { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip:          { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.cardBorder },
  chipActive:    { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText:      { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13 },
  list:          { padding: 20, paddingBottom: 40 },
  card:          { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  subjectBadge:  { backgroundColor: COLORS.brand + '22', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  subjectText:   { ...FONTS.bold, fontSize: 13, color: COLORS.brand },
  dateText:      { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  topic:         { ...FONTS.bold, fontSize: 15, color: COLORS.text, marginBottom: 4 },
  classMeta:     { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginBottom: 6 },
  notes:         { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  teacher:       { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
  overlay:       { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:         { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: COLORS.cardBorder, maxHeight: '90%' },
  sheetHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.cardBorder, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:    { ...FONTS.bold, fontSize: 18, color: COLORS.text, marginBottom: 16 },
  fieldLabel:    { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginBottom: 6 },
  textInput:     { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.cardBorder, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 15, marginBottom: 12 },
  emptyState:    { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyEmoji:    { fontSize: 48, marginBottom: 14 },
  emptyTitle:    { ...FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: 6 },
  emptySubtitle: { ...FONTS.regular, fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
