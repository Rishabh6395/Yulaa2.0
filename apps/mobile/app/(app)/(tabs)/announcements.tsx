import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getAnnouncements, createAnnouncement } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { Badge } from '../../../src/components/ui/Badge';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const CATEGORIES = ['general', 'academic', 'events', 'holiday', 'exam'];

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AnnouncementsScreen() {
  const { user } = useAuth();
  const qc       = useQueryClient();
  const isAdmin  = user?.primaryRole === 'admin' || user?.primaryRole === 'principal';
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [title,    setTitle]    = useState('');
  const [content,  setContent]  = useState('');
  const [category, setCategory] = useState('general');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['announcements'],
    queryFn: getAnnouncements,
  });

  const createMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setShowCreate(false);
      setTitle(''); setContent(''); setCategory('general');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const announcements: any[] = data?.announcements ?? [];
  const pinned   = announcements.filter((a: any) => a.pinned);
  const unpinned = announcements.filter((a: any) => !a.pinned);
  const sorted   = [...pinned, ...unpinned];

  async function handleCreate() {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Validation', 'Title and content are required.');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createMutation.mutate({ title, content, category });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />
        }
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 0, damping: 18 }}
          style={styles.header}
        >
          <Text style={styles.screenTitle}>Notices</Text>
          {isAdmin && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCreate(true); }}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.addBtnGrad}>
                <Text style={styles.addBtnText}>+ New</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </MotiView>

        {isLoading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : sorted.length === 0 ? (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 120, damping: 16 }}
            style={styles.emptyState}
          >
            <Text style={styles.emptyEmoji}>📢</Text>
            <Text style={styles.emptyText}>No announcements yet</Text>
          </MotiView>
        ) : (
          sorted.map((ann: any, i: number) => (
            <MotiView
              key={ann.id ?? i}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 60 + i * 70, damping: 18 }}
              style={[styles.annCard, ann.pinned && styles.annCardPinned]}
            >
              {ann.pinned && (
                <View style={styles.pinnedRow}>
                  <Text style={styles.pinnedLabel}>📌 Pinned</Text>
                </View>
              )}
              <View style={styles.annTopRow}>
                <Badge status={ann.category ?? 'general'} />
                <Text style={styles.annTime}>{ann.created_at ? timeAgo(ann.created_at) : ''}</Text>
              </View>
              <Text style={styles.annTitle}>{ann.title}</Text>
              <Text style={styles.annContent}>{ann.content}</Text>
              {ann.author_name && (
                <Text style={styles.annAuthor}>— {ann.author_name}</Text>
              )}
            </MotiView>
          ))
        )}
      </ScrollView>

      {/* Create Announcement Modal */}
      <Modal visible={showCreate} animationType="none" transparent onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowCreate(false)} />
          <AnimatePresence>
            {showCreate && (
              <MotiView
                from={{ translateY: 600 }}
                animate={{ translateY: 0 }}
                exit={{ translateY: 600 }}
                transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                style={styles.bottomSheet}
              >
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>New Announcement</Text>

                <Input
                  label="Title"
                  required
                  placeholder="Announcement title"
                  value={title}
                  onChangeText={setTitle}
                />
                <Input
                  label="Content"
                  required
                  placeholder="Write your announcement..."
                  value={content}
                  onChangeText={setContent}
                  multiline
                  numberOfLines={4}
                  style={{ minHeight: 100 }}
                />

                <Text style={styles.fieldLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, category === cat && styles.chipActive]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[styles.chipText, category === cat && { color: COLORS.white }]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Button
                  label="Publish Announcement"
                  onPress={handleCreate}
                  loading={createMutation.isPending}
                />
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setShowCreate(false)}
                  style={{ marginTop: 8 }}
                />
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
  content: { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  screenTitle: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  addBtn:      { borderRadius: RADIUS.md, overflow: 'hidden' },
  addBtnGrad:  { paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText:  { ...FONTS.bold, color: COLORS.white, fontSize: 14 },

  annCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 18,
    marginBottom: 14,
    ...SHADOW.sm,
  },
  annCardPinned: {
    borderColor: COLORS.gold + '55',
    backgroundColor: COLORS.card,
  },
  pinnedRow:    { marginBottom: 8 },
  pinnedLabel:  { ...FONTS.medium, fontSize: 12, color: COLORS.gold },
  annTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  annTime:      { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  annTitle:     { ...FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: 8 },
  annContent:   { ...FONTS.regular, fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },
  annAuthor:    { ...FONTS.medium, fontSize: 12, color: COLORS.brand, marginTop: 10 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 14 },
  emptyText:  { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  bottomSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.cardBorder,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle:  { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: 20 },
  fieldLabel:  { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
  chip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  chipActive:  { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText:    { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13, textTransform: 'capitalize' },
});
