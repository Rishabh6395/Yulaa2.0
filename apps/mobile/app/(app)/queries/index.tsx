import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ScrollView, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getQueries, createQueryItem } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const STATUSES = ['all', 'open', 'in_progress', 'resolved', 'closed'];

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const STATUS_COLOR: Record<string, string> = {
  open: '#3b82f6', in_progress: '#f59e0b', resolved: '#10b981', closed: COLORS.textMuted,
};

export default function QueriesScreen() {
  const router = useRouter();
  const qc     = useQueryClient();
  const [status,     setStatus]     = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [subject,    setSubject]    = useState('');
  const [message,    setMessage]    = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['queries', status],
    queryFn: () => getQueries(status !== 'all' ? `status=${status}` : undefined),
  });

  const createMutation = useMutation({
    mutationFn: () => createQueryItem({ subject, message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queries'] });
      setShowForm(false); setSubject(''); setMessage('');
      Alert.alert('Query Submitted', 'Your query has been submitted.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const queries: any[] = data?.queries ?? data?.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Queries</Text>
        <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.8}>
          <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.fabGrad}>
            <Text style={styles.fabText}>+ New</Text>
          </LinearGradient>
        </TouchableOpacity>
      </MotiView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {STATUSES.map(s => (
          <TouchableOpacity key={s} style={[styles.chip, status === s && styles.chipActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStatus(s); }}>
            <Text style={[styles.chipText, status === s && { color: COLORS.white }]}>{s === 'all' ? 'All' : s.replace(/_/g, ' ')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={queries}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          renderItem={({ item, index }) => {
            const color = STATUS_COLOR[item.status ?? 'open'] ?? COLORS.textMuted;
            return (
              <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <Text style={styles.querySubject}>{item.subject ?? item.title ?? 'Query'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.statusText, { color }]}>{(item.status ?? 'open').replace(/_/g, ' ')}</Text>
                    </View>
                  </View>
                  {item.message && <Text style={styles.queryMsg} numberOfLines={2}>{item.message}</Text>}
                  <Text style={styles.queryDate}>{formatDate(item.created_at)}</Text>
                </View>
              </MotiView>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyText}>No queries found</Text>
            </View>
          }
        />
      )}

      <Modal visible={showForm} animationType="none" transparent onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowForm(false)} />
          <AnimatePresence>
            {showForm && (
              <MotiView from={{ translateY: 500 }} animate={{ translateY: 0 }} exit={{ translateY: 500 }} transition={{ type: 'spring', damping: 22, stiffness: 200 }} style={styles.sheet}>
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>New Query</Text>
                <Input label="Subject" required value={subject} onChangeText={setSubject} placeholder="Brief subject" />
                <Input label="Message" required value={message} onChangeText={setMessage} placeholder="Describe your query..." multiline numberOfLines={4} />
                <Button label="Submit" onPress={() => createMutation.mutate()} loading={createMutation.isPending} style={{ marginTop: 8 }} />
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
  safe:        { flex: 1, backgroundColor: COLORS.bg },
  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:        { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  fab:         { borderRadius: RADIUS.md, overflow: 'hidden' },
  fabGrad:     { paddingHorizontal: 16, paddingVertical: 10 },
  fabText:     { ...FONTS.bold, color: COLORS.white, fontSize: 14 },
  filtersRow:  { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip:        { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.cardBorder },
  chipActive:  { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText:    { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13, textTransform: 'capitalize' },
  list:        { padding: 20, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  cardRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  querySubject:{ ...FONTS.bold, fontSize: 15, color: COLORS.text, flex: 1 },
  queryMsg:    { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 8 },
  queryDate:   { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  statusBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:  { ...FONTS.medium, fontSize: 12, textTransform: 'capitalize' },
  emptyState:  { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:  { fontSize: 48, marginBottom: 14 },
  emptyText:   { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
  overlay:     { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:       { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.cardBorder, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:  { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: 20 },
});
