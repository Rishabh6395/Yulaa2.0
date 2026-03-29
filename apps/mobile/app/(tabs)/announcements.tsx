import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { getAnnouncements } from '../../src/api/client';

export default function AnnouncementsScreen() {
  const [items,   setItems]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnnouncements()
      .then((d: any) => setItems(d.announcements || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Announcements</Text>
      {loading ? (
        <ActivityIndicator color="#1A8CA5" style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <Text style={s.empty}>No announcements yet.</Text>
      ) : (
        items.map((a: any) => (
          <View key={a.id} style={s.card}>
            <Text style={s.aTitle}>{a.title}</Text>
            <Text style={s.aBody}>{a.body ?? a.content}</Text>
            <Text style={s.aDate}>{new Date(a.createdAt).toLocaleDateString('en-IN')}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafb' },
  content:   { padding: 20, paddingBottom: 40 },
  title:     { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 20 },
  card:      { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  aTitle:    { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 6 },
  aBody:     { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 8 },
  aDate:     { fontSize: 12, color: '#aaa' },
  empty:     { textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 15 },
});
