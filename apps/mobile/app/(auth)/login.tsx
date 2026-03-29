import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { requestOtp } from '../../src/api/client';

export default function LoginScreen() {
  const { login }           = useAuth();
  const [phone,   setPhone] = useState('');
  const [otp,     setOtp]   = useState('');
  const [step,    setStep]  = useState<'phone' | 'otp'>('phone');
  const [busy,    setBusy]  = useState(false);

  async function handleSendOtp() {
    if (!phone.trim()) return;
    setBusy(true);
    try {
      await requestOtp(phone.trim());
      setStep('otp');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setBusy(false); }
  }

  async function handleVerify() {
    if (!otp.trim()) return;
    setBusy(true);
    try {
      await login(phone.trim(), otp.trim());
      // Navigation handled by _layout.tsx
    } catch (e: any) {
      Alert.alert('Invalid OTP', e.message);
    } finally { setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.card}>
        {/* Logo */}
        <View style={s.logo}><Text style={s.logoText}>Y</Text></View>
        <Text style={s.title}>Welcome to Yulaa</Text>
        <Text style={s.sub}>
          {step === 'phone' ? 'Enter your registered mobile number' : `Enter the OTP sent to ${phone}`}
        </Text>

        {step === 'phone' ? (
          <>
            <TextInput
              style={s.input}
              placeholder="+91 XXXXX XXXXX"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              returnKeyType="done"
              onSubmitEditing={handleSendOtp}
            />
            <TouchableOpacity style={s.btn} onPress={handleSendOtp} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={s.input}
              placeholder="6-digit OTP"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              autoFocus
            />
            <TouchableOpacity style={s.btn} onPress={handleVerify} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Verify & Login</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); }}>
              <Text style={s.link}>← Change number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const BRAND = '#1A8CA5';
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF6F8', justifyContent: 'center', padding: 24 },
  card:      { backgroundColor: '#fff', borderRadius: 20, padding: 28, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  logo:      { width: 56, height: 56, borderRadius: 14, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoText:  { color: '#fff', fontWeight: '800', fontSize: 24 },
  title:     { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 6 },
  sub:       { fontSize: 14, color: '#777', marginBottom: 24, lineHeight: 20 },
  input:     { borderWidth: 1.5, borderColor: '#e4e9ed', borderRadius: 12, padding: 14, fontSize: 16, color: '#111', marginBottom: 16 },
  btn:       { backgroundColor: BRAND, borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 12 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
  link:      { color: BRAND, textAlign: 'center', fontSize: 14, marginTop: 4 },
});
