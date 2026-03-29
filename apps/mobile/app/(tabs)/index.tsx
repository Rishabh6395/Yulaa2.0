import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { getLeaveBalance } from '../../src/api/client';

export default function DashboardScreen() {
  const { logout }          = useAuth();
  const [balance, setBalance] = useState<any>(null);

  useEffect(() => {
    getLeaveBalance().then(setBalance).catch(() => null);
  }, []);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.greeting}>Good morning 👋</Text>
      <Text style={s.sub}>Here is your school summary for today.</Text>

      {balance && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Leave Balance</Text>
          {Array.isArray(balance)
            ? balance.map((b: any) => (
              <View key={b.leaveType} style={s.row}>
                <Text style={s.rowLabel}>{b.leaveType}</Text>
                <Text style={s.rowValue}>{b.remaining}/{b.totalDays} days</Text>
              </View>
            ))
            : <Text style={s.rowLabel}>{balance.remaining ?? '—'} days remaining</Text>
          }
        </View>
      )}

      <View style={s.card}>
        <Text style={s.cardTitle}>Quick Links</Text>
        {[
          { label: '📋 Mark Attendance', tab: 'attendance' },
          { label: '🗓️ Apply Leave',      tab: 'leave' },
          { label: '📢 Announcements',    tab: 'announcements' },
        ].map(l => (
          <TouchableOpacity key={l.label} style={s.quickLink}>
            <Text style={s.quickLinkText}>{l.label}</Text>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={() => {
        Alert.alert('Sign Out', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: logout },
        ]);
      }}>
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f8fafb' },
  content:       { padding: 20, paddingBottom: 40 },
  greeting:      { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 4 },
  sub:           { fontSize: 14, color: '#777', marginBottom: 24 },
  card:          { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle:     { fontSize: 14, fontWeight: '700', color: '#444', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  row:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f4f6' },
  rowLabel:      { fontSize: 14, color: '#555' },
  rowValue:      { fontSize: 14, fontWeight: '600', color: '#1A8CA5' },
  quickLink:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f4f6' },
  quickLinkText: { fontSize: 15, color: '#333' },
  chevron:       { fontSize: 20, color: '#ccc' },
  logoutBtn:     { marginTop: 8, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#fca5a5', alignItems: 'center' },
  logoutText:    { color: '#ef4444', fontWeight: '600' },
});
