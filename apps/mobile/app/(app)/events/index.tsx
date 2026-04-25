import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getEvents, createEvent } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const EVENT_TYPES = ['academic', 'cultural', 'sports', 'holiday', 'exam', 'meeting', 'other'];

const TYPE_COLORS: Record<string, string> = {
  academic: COLORS.brand,
  cultural: '#8b5cf6',
  sports:   COLORS.green,
  holiday:  COLORS.amber,
  exam:     COLORS.red,
  meeting:  COLORS.gold,
  other:    COLORS.textMuted,
};

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day:   d.getDate(),
    month: d.toLocaleString('en-US', { month: 'short' }),
    weekday: d.toLocaleString('en-US', { weekday: 'short' }),
  };
}

export default function EventsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.primaryRole === 'admin' || user?.primaryRole === 'principal';
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate]   = useState('');
  const [eventType, setEventType]   = useState('academic');
  const [eventDesc, setEventDesc]   = useState('');
  const [eventVenue, setEventVenue] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: getEvents,
  });

  const createMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      setShowCreate(false);
      resetForm();
      Alert.alert('Success', 'Event created successfully.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  function resetForm() {
    setEventTitle(''); setEventDate(''); setEventType('academic');
    setEventDesc(''); setEventVenue('');
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  async function handleCreate() {
    if (!eventTitle.trim() || !eventDate.trim()) {
      Alert.alert('Validation', 'Title and date are required.');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createMutation.mutate({
      title:       eventTitle,
      event_date:  eventDate,
      event_type:  eventType,
      description: eventDesc,
      venue:       eventVenue,
    });
  }

  const events: any[] = data?.events ?? data?.data ?? [];
  const upcoming = events.filter((e: any) => new Date(e.event_date ?? e.date) >= new Date(new Date().setHours(0, 0, 0, 0)));
  const past     = events.filter((e: any) => new Date(e.event_date ?? e.date) < new Date(new Date().setHours(0, 0, 0, 0)));

  function renderItem({ item, index }: { item: any; index: number }) {
    const dateStr = item.event_date ?? item.date ?? '';
    const { day, month, weekday } = dateStr ? formatEventDate(dateStr) : { day: '-', month: '', weekday: '' };
    const type = item.event_type ?? item.type ?? 'other';
    const color = TYPE_COLORS[type] ?? COLORS.textMuted;

    return (
      <MotiView
        from={{ opacity: 0, translateX: -16 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'spring', delay: index * 60, damping: 18 }}
        style={styles.eventCard}
      >
        <View style={[styles.datePill, { backgroundColor: color + '22', borderColor: color + '44' }]}>
          <Text style={[styles.dateDay, { color }]}>{day}</Text>
          <Text style={[styles.dateMonth, { color }]}>{month}</Text>
          <Text style={[styles.dateWeekday, { color: color + 'aa' }]}>{weekday}</Text>
        </View>
        <View style={styles.eventInfo}>
          <View style={styles.eventTopRow}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <View style={[styles.typeBadge, { backgroundColor: color + '22' }]}>
              <Text style={[styles.typeBadgeText, { color }]}>{type}</Text>
            </View>
          </View>
          {item.description && (
            <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>
          )}
          {item.venue && (
            <Text style={styles.eventVenue}>📍 {item.venue}</Text>
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
        <Text style={styles.title}>Events</Text>
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
        <View style={{ padding: 20 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={[...upcoming, ...past]}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          stickyHeaderIndices={upcoming.length > 0 ? [0] : []}
          ListHeaderComponent={
            events.length > 0 ? (
              <>
                {upcoming.length > 0 && (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Upcoming</Text>
                  </View>
                )}
              </>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.brand}
              colors={[COLORS.brand]}
            />
          }
          ListEmptyComponent={
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 100 }}
              style={styles.empty}
            >
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyText}>No events scheduled</Text>
            </MotiView>
          }
        />
      )}

      {/* Create Event Modal */}
      <Modal visible={showCreate} animationType="none" transparent onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowCreate(false)} />
          <AnimatePresence>
            {showCreate && (
              <MotiView
                from={{ translateY: 700 }}
                animate={{ translateY: 0 }}
                exit={{ translateY: 700 }}
                transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                style={styles.sheet}
              >
                <View style={styles.sheetHandle} />
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.sheetTitle}>Create Event</Text>

                  <Input
                    label="Event Title"
                    required
                    placeholder="e.g. Annual Sports Day"
                    value={eventTitle}
                    onChangeText={setEventTitle}
                  />
                  <Input
                    label="Date"
                    required
                    placeholder="YYYY-MM-DD"
                    value={eventDate}
                    onChangeText={setEventDate}
                  />
                  <Input
                    label="Venue"
                    placeholder="School auditorium..."
                    value={eventVenue}
                    onChangeText={setEventVenue}
                  />
                  <Input
                    label="Description"
                    placeholder="Event details..."
                    value={eventDesc}
                    onChangeText={setEventDesc}
                    multiline
                    numberOfLines={3}
                    style={{ minHeight: 80 }}
                  />

                  <Text style={styles.fieldLabel}>Event Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                    {EVENT_TYPES.map(type => {
                      const color = TYPE_COLORS[type] ?? COLORS.textMuted;
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeChip,
                            eventType === type && { backgroundColor: color, borderColor: color },
                          ]}
                          onPress={() => setEventType(type)}
                        >
                          <Text style={[styles.typeChipText, eventType === type && { color: COLORS.white }]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Button
                    label="Create Event"
                    onPress={handleCreate}
                    loading={createMutation.isPending}
                  />
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onPress={() => setShowCreate(false)}
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  title: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  addBtn:     { borderRadius: RADIUS.md, overflow: 'hidden' },
  addBtnGrad: { paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText: { ...FONTS.bold, color: COLORS.white, fontSize: 14 },

  list: { padding: 20, paddingBottom: 40 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle:  { ...FONTS.bold, fontSize: 14, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },

  eventCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    marginBottom: 12, overflow: 'hidden', ...SHADOW.sm,
  },
  datePill: {
    width: 64, alignItems: 'center', justifyContent: 'center',
    padding: 12, borderRightWidth: 1, borderRightColor: COLORS.cardBorder,
  },
  dateDay:    { ...FONTS.xbold, fontSize: 24 },
  dateMonth:  { ...FONTS.bold, fontSize: 12, textTransform: 'uppercase', marginTop: -2 },
  dateWeekday:{ ...FONTS.regular, fontSize: 11, marginTop: 2 },
  eventInfo:  { flex: 1, padding: 14 },
  eventTopRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  eventTitle: { ...FONTS.bold, fontSize: 15, color: COLORS.text, flex: 1, marginRight: 8 },
  typeBadge:  { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { ...FONTS.bold, fontSize: 11, textTransform: 'capitalize' },
  eventDesc:  { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 6 },
  eventVenue: { ...FONTS.medium, fontSize: 12, color: COLORS.textMuted },

  empty:     { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:{ fontSize: 48, marginBottom: 14 },
  emptyText: { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 0,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.cardBorder,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle:  { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: 20 },
  fieldLabel:  { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
  typeChip: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  typeChipText: { ...FONTS.medium, color: COLORS.textMuted, fontSize: 13, textTransform: 'capitalize' },
});
