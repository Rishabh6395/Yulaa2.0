import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function AttendanceScreen() {
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>My Attendance</Text>
      <Text style={s.sub}>Monthly calendar view coming soon.</Text>
      <View style={s.placeholder}>
        <Text style={s.placeholderText}>📋</Text>
        <Text style={s.placeholderSub}>Attendance calendar</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f8fafb' },
  content:        { padding: 20 },
  title:          { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 4 },
  sub:            { fontSize: 14, color: '#777', marginBottom: 24 },
  placeholder:    { backgroundColor: '#fff', borderRadius: 16, padding: 48, alignItems: 'center' },
  placeholderText: { fontSize: 48, marginBottom: 12 },
  placeholderSub: { fontSize: 15, color: '#aaa' },
});
