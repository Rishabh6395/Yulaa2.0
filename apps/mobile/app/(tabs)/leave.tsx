import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { getLeaves, submitLeave } from '../../src/api/client';

const BRAND = '#1A8CA5';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    pending:   { bg: '#fef3c7', text: '#92400e' },
    approved:  { bg: '#d1fae5', text: '#065f46' },
    rejected:  { bg: '#fee2e2', text: '#991b1b' },
    withdrawn: { bg: '#f1f5f9', text: '#64748b' },
  };
  const c = colors[status] || colors.pending;
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
      <Text style={{ color: c.text, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>{status}</Text>
    </View>
  );
}

export default function LeaveScreen() {
  const [leaves,      setLeaves]      = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [form,        setForm]        = useState({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });

  useEffect(() => {
    getLeaves().then(d => setLeaves(d.leaves || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (!form.start_date || !form.end_date || !form.reason.trim()) {
      Alert.alert('Required', 'Please fill all fields.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await submitLeave(form);
      setLeaves(l => [data.leave, ...l]);
      setShowForm(false);
      setForm({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });
      Alert.alert('Success', 'Leave request submitted.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setSubmitting(false); }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.title}>Leave Requests</Text>
        <TouchableOpacity style={s.applyBtn} onPress={() => setShowForm(f => !f)}>
          <Text style={s.applyBtnText}>{showForm ? '✕ Cancel' : '+ Apply'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={s.form}>
          <Text style={s.formLabel}>Leave Type</Text>
          {['sick', 'casual', 'personal'].map(t => (
            <TouchableOpacity key={t} style={[s.typeBtn, form.leave_type === t && s.typeBtnActive]}
              onPress={() => setForm(f => ({ ...f, leave_type: t }))}>
              <Text style={[s.typeBtnText, form.leave_type === t && { color: '#fff' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
          <Text style={[s.formLabel, { marginTop: 12 }]}>From Date (YYYY-MM-DD)</Text>
          <TextInput style={s.input} placeholder="2025-04-01" value={form.start_date}
            onChangeText={v => setForm(f => ({ ...f, start_date: v }))} />
          <Text style={s.formLabel}>To Date (YYYY-MM-DD)</Text>
          <TextInput style={s.input} placeholder="2025-04-03" value={form.end_date}
            onChangeText={v => setForm(f => ({ ...f, end_date: v }))} />
          <Text style={s.formLabel}>Reason</Text>
          <TextInput style={[s.input, { height: 80 }]} placeholder="Reason for leave"
            multiline value={form.reason} onChangeText={v => setForm(f => ({ ...f, reason: v }))} />
          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Submit Request</Text>}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={BRAND} style={{ marginTop: 40 }} />
      ) : leaves.length === 0 ? (
        <Text style={s.empty}>No leave requests yet.</Text>
      ) : (
        leaves.map((l: any) => (
          <View key={l.id} style={s.leaveCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={s.leaveType}>{l.leaveType ?? l.leave_type}</Text>
                <Text style={s.leaveDates}>{l.startDate?.split('T')[0]} → {l.endDate?.split('T')[0]}</Text>
              </View>
              <StatusBadge status={l.status} />
            </View>
            <Text style={s.leaveReason} numberOfLines={2}>{l.reason}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafb' },
  content:      { padding: 20, paddingBottom: 40 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title:        { fontSize: 20, fontWeight: '700', color: '#111' },
  applyBtn:     { backgroundColor: BRAND, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  applyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  form:         { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  formLabel:    { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:        { borderWidth: 1.5, borderColor: '#e4e9ed', borderRadius: 10, padding: 12, fontSize: 15, color: '#111', marginBottom: 12 },
  typeBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#e4e9ed', marginRight: 8, marginBottom: 8, display: 'flex', alignSelf: 'flex-start' },
  typeBtnActive: { backgroundColor: BRAND, borderColor: BRAND },
  typeBtnText:  { fontSize: 13, color: '#555', fontWeight: '600', textTransform: 'capitalize' },
  submitBtn:    { backgroundColor: BRAND, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  leaveCard:    { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  leaveType:    { fontSize: 15, fontWeight: '700', color: '#111', textTransform: 'capitalize', marginBottom: 2 },
  leaveDates:   { fontSize: 13, color: '#777', marginBottom: 8 },
  leaveReason:  { fontSize: 13, color: '#555' },
  empty:        { textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 15 },
});
