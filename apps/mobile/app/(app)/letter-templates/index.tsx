import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getLetterTemplates } from '../../../src/api/client';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

export default function LetterTemplatesScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ['letter-templates'], queryFn: () => getLetterTemplates() });
  const templates: any[] = data?.templates ?? data?.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <MotiView from={{ opacity: 0, translateY: -16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: 0, damping: 18 }} style={styles.topBar}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Letter Templates</Text>
        <View style={{ width: 60 }} />
      </MotiView>

      {isLoading ? (
        <View style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 50, damping: 18 }}>
              <TouchableOpacity style={styles.card} activeOpacity={0.75}>
                <View style={styles.iconBox}><Text style={{ fontSize: 24 }}>📄</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.templateName}>{item.name ?? item.title ?? item.template_name ?? 'Template'}</Text>
                  {item.type && <Text style={styles.templateType}>{item.type}</Text>}
                  {item.description && <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>}
                </View>
              </TouchableOpacity>
            </MotiView>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📄</Text>
              <Text style={styles.emptyText}>No letter templates found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.bg },
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  back:         { ...FONTS.medium, fontSize: 15, color: COLORS.brand },
  screenTitle:  { ...FONTS.bold, fontSize: 20, color: COLORS.text },
  list:         { padding: 20, paddingBottom: 40 },
  card:         { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 12, ...SHADOW.sm, flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox:      { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.brand + '22', alignItems: 'center', justifyContent: 'center' },
  templateName: { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  templateType: { ...FONTS.medium, fontSize: 13, color: COLORS.brand, marginTop: 2 },
  desc:         { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  emptyState:   { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:   { fontSize: 48, marginBottom: 14 },
  emptyText:    { ...FONTS.medium, fontSize: 16, color: COLORS.textMuted },
});
