import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getLibraryBooks, getLibraryIssues } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { useAuth } from '../../../src/context/AuthContext';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const TABS = ['Browse Books', 'My Issues'];

function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return diff;
}

export default function LibraryScreen() {
  const router   = useRouter();
  const [tab, setTab]           = useState(0);
  const [search, setSearch]     = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: booksData, isLoading: booksLoading, refetch: refetchBooks } = useQuery({
    queryKey: ['library-books', search],
    queryFn: () => getLibraryBooks(search ? `search=${encodeURIComponent(search)}` : undefined),
    enabled: tab === 0,
  });

  const { data: issuesData, isLoading: issuesLoading, refetch: refetchIssues } = useQuery({
    queryKey: ['library-issues'],
    queryFn: () => getLibraryIssues('mine=true'),
    enabled: tab === 1,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (tab === 0) await refetchBooks();
    else await refetchIssues();
    setRefreshing(false);
  }, [tab, refetchBooks, refetchIssues]);

  const books: any[]  = booksData?.books ?? booksData?.data ?? [];
  const issues: any[] = issuesData?.issues ?? issuesData?.data ?? [];
  const isLoading     = tab === 0 ? booksLoading : issuesLoading;

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
        <Text style={styles.screenTitle}>Library</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === i && styles.tabActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(i); }}
          >
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 0 && (
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', delay: 40 }} style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, author, ISBN..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ ...FONTS.medium, color: COLORS.textMuted, fontSize: 16, padding: 4 }}>✕</Text>
            </TouchableOpacity>
          )}
        </MotiView>
      )}

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
      ) : tab === 0 ? (
        <FlatList
          data={books}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          renderItem={({ item, index }) => {
            const available = item.availableCopies ?? item.available_copies ?? 0;
            const isAvail   = available > 0;
            return (
              <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 40, damping: 18 }}>
                <View style={styles.card}>
                  <View style={styles.bookRow}>
                    <View style={styles.bookCover}>
                      <Text style={{ fontSize: 28 }}>📚</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bookTitle} numberOfLines={2}>{item.title ?? 'Book'}</Text>
                      {item.author && <Text style={styles.bookAuthor}>by {item.author}</Text>}
                      {item.genre  && <Text style={styles.bookMeta}>{item.genre}</Text>}
                      {item.isbn   && <Text style={styles.bookMeta}>ISBN: {item.isbn}</Text>}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={[styles.availBadge, { backgroundColor: isAvail ? '#10b98122' : '#ef444422' }]}>
                        <Text style={[styles.availText, { color: isAvail ? '#10b981' : '#ef4444' }]}>
                          {isAvail ? `${available} avail.` : 'Unavail.'}
                        </Text>
                      </View>
                      <Text style={styles.copyCount}>{item.totalCopies ?? item.total_copies ?? 0} total</Text>
                    </View>
                  </View>
                  {item.location && <Text style={styles.location}>📍 {item.location}</Text>}
                </View>
              </MotiView>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📖</Text>
              <Text style={styles.emptyTitle}>{search ? 'No books found' : 'Library is empty'}</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try a different title, author, or ISBN.' : 'No books have been added yet.'}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={issues}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />}
          renderItem={({ item, index }) => {
            const due      = item.dueDate ?? item.due_date;
            const daysLeft = due ? daysUntil(due) : null;
            const isOver   = daysLeft !== null && daysLeft < 0;
            const isSoon   = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
            const statusColor = item.status === 'returned' ? '#10b981' : isOver ? '#ef4444' : isSoon ? '#f59e0b' : COLORS.brand;
            return (
              <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
                <View style={[styles.card, isOver && { borderColor: '#ef444433' }]}>
                  <View style={styles.issueRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bookTitle}>{item.book?.title ?? item.bookTitle ?? 'Book'}</Text>
                      {item.book?.author && <Text style={styles.bookAuthor}>by {item.book.author}</Text>}
                      <Text style={styles.issuedDate}>Issued: {fmtDate(item.issuedAt ?? item.issued_at)}</Text>
                    </View>
                    <View style={[styles.availBadge, { backgroundColor: statusColor + '22' }]}>
                      <Text style={[styles.availText, { color: statusColor }]}>
                        {item.status === 'returned' ? 'Returned' :
                         item.status === 'overdue'  ? 'Overdue' :
                         item.status === 'lost'     ? 'Lost' : 'Issued'}
                      </Text>
                    </View>
                  </View>
                  {due && item.status !== 'returned' && (
                    <View style={styles.dueRow}>
                      <Text style={[styles.dueText, { color: statusColor }]}>
                        {isOver
                          ? `⚠️ Overdue by ${Math.abs(daysLeft!)} day${Math.abs(daysLeft!) !== 1 ? 's' : ''}`
                          : isSoon
                          ? `⏰ Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                          : `📅 Due: ${fmtDate(due)}`}
                      </Text>
                      {(item.fine ?? 0) > 0 && (
                        <Text style={styles.fine}>Fine: ₹{item.fine}</Text>
                      )}
                    </View>
                  )}
                  {item.status === 'returned' && item.returnedAt && (
                    <Text style={styles.returnedAt}>Returned: {fmtDate(item.returnedAt)}</Text>
                  )}
                </View>
              </MotiView>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📚</Text>
              <Text style={styles.emptyTitle}>No Issued Books</Text>
              <Text style={styles.emptySubtitle}>You have no books currently borrowed from the library.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.bg },
  topBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:          { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle:   { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  tabBar:        { flexDirection: 'row', marginHorizontal: 20, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 4, marginBottom: 12 },
  tab:           { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: RADIUS.md },
  tabActive:     { backgroundColor: COLORS.brand },
  tabText:       { ...FONTS.medium, fontSize: 14, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.white },
  searchWrap:    { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.cardBorder, marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 12 },
  searchIcon:    { fontSize: 16, marginRight: 8 },
  searchInput:   { flex: 1, paddingVertical: 12, color: COLORS.text, fontSize: 15 },
  list:          { padding: 20, paddingBottom: 40 },
  card:          { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm },
  bookRow:       { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  bookCover:     { width: 52, height: 52, backgroundColor: COLORS.brand + '22', borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  bookTitle:     { ...FONTS.bold, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  bookAuthor:    { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  bookMeta:      { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  availBadge:    { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  availText:     { ...FONTS.bold, fontSize: 12 },
  copyCount:     { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  location:      { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
  issueRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  issuedDate:    { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  dueRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dueText:       { ...FONTS.medium, fontSize: 13 },
  fine:          { ...FONTS.bold, fontSize: 13, color: '#ef4444' },
  returnedAt:    { ...FONTS.medium, fontSize: 12, color: '#10b981' },
  emptyState:    { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyEmoji:    { fontSize: 48, marginBottom: 14 },
  emptyTitle:    { ...FONTS.bold, fontSize: 16, color: COLORS.text, marginBottom: 6 },
  emptySubtitle: { ...FONTS.regular, fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
