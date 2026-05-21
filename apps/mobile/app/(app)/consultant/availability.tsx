import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getConsultantAvailability, updateConsultantAvailability } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ConsultantAvailabilityScreen() {
  const router = useRouter();
  const qc     = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['consultant-availability'], queryFn: getConsultantAvailability });
  const slots: any[] = data?.slots ?? data?.availability ?? data?.data ?? [];

  const toggleMutation = useMutation({
    mutationFn: (body: any) => updateConsultantAvailability(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consultant-availability'] }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Availability</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={slots.length > 0 ? slots : DAYS.map(d => ({ day: d, available: false }))}
          keyExtractor={(item, i) => item.id ?? item.day ?? String(i)}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 40, damping: 18 }}>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.dayName}>{item.day ?? item.day_of_week ?? `Day ${index + 1}`}</Text>
                  <TouchableOpacity
                    style={[styles.toggle, item.available ? styles.toggleOn : styles.toggleOff]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleMutation.mutate({ ...item, available: !item.available }); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.toggleText}>{item.available ? 'Available' : 'Unavailable'}</Text>
                  </TouchableOpacity>
                </View>
                {item.start_time && item.end_time && (
                  <Text style={styles.timeRange}>🕐 {item.start_time} – {item.end_time}</Text>
                )}
              </View>
            </MotiView>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.bg },
  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:        { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  list:        { padding: 20, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 10, ...SHADOW.sm },
  cardRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  dayName:     { ...FONTS.bold, fontSize: 16, color: COLORS.text },
  toggle:      { borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 8 },
  toggleOn:    { backgroundColor: '#10b98122' },
  toggleOff:   { backgroundColor: COLORS.surface },
  toggleText:  { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  timeRange:   { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted },
});
