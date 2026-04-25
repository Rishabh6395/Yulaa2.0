import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/context/AuthContext';
import { requestOtp } from '../../src/api/client';
import { COLORS, FONTS, RADIUS } from '../../src/theme';

type Method = 'email' | 'phone';
type PhoneStep = 'phone' | 'otp';

export default function LoginScreen() {
  const { loginWithOtp, loginWithEmail } = useAuth();

  const [method, setMethod] = useState<Method>('email');
  const [busy, setBusy] = useState(false);

  // Email/password state
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);

  // Phone/OTP state
  const [phone,    setPhone]    = useState('');
  const [otp,      setOtp]      = useState(['', '', '', '', '', '']);
  const [step,     setStep]     = useState<PhoneStep>('phone');
  const otpRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRefs.current[0]?.focus(), 300);
  }, [step]);

  function switchMethod(m: Method) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMethod(m);
    setStep('phone');
    setOtp(['', '', '', '', '', '']);
  }

  // ── Email login ──────────────────────────────────────────────────────────────
  async function handleEmailLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Enter your email and password.');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusy(true);
    try {
      await loginWithEmail(email.trim().toLowerCase(), password);
    } catch (e: any) {
      Alert.alert('Sign In Failed', e.message);
    } finally {
      setBusy(false);
    }
  }

  // ── OTP login ────────────────────────────────────────────────────────────────
  async function handleSendOtp() {
    if (!phone.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusy(true);
    try {
      await requestOtp(phone.trim());
      setStep('otp');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    const code = otp.join('');
    if (code.length < 6) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusy(true);
    try {
      await loginWithOtp(phone.trim(), code);
    } catch (e: any) {
      Alert.alert('Invalid OTP', e.message);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  }

  function handleOtpChange(val: string, idx: number) {
    const digits = val.replace(/[^0-9]/g, '');
    if (digits.length > 1) {
      const arr = digits.slice(0, 6).split('');
      const next = [...otp];
      arr.forEach((d, i) => { if (i < 6) next[i] = d; });
      setOtp(next);
      otpRefs.current[Math.min(arr.length, 5)]?.focus();
      return;
    }
    const next = [...otp]; next[idx] = digits; setOtp(next);
    if (digits && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKeyPress(key: string, idx: number) {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      const next = [...otp]; next[idx - 1] = ''; setOtp(next);
      otpRefs.current[idx - 1]?.focus();
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <LinearGradient colors={[COLORS.bg, '#071020', '#0a1628']} style={StyleSheet.absoluteFill} />

      {/* Glow orb */}
      <MotiView
        from={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ type: 'timing', duration: 1200 }}
        style={styles.glowOrb}
      />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <MotiView
            from={{ opacity: 0, translateY: -30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 100, damping: 18 }}
            style={styles.logoSection}
          >
            <LinearGradient
              colors={[COLORS.gold, '#e8c07a', COLORS.gold]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.logoCircle}
            >
              <Text style={styles.logoY}>Y</Text>
            </LinearGradient>
            <Text style={styles.brandName}>YULAA</Text>
            <Text style={styles.brandTagline}>School Management System</Text>
          </MotiView>

          {/* Card */}
          <MotiView
            from={{ opacity: 0, translateY: 40 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 280, damping: 18, stiffness: 100 }}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSub}>Sign in to your account</Text>

            {/* Method toggle */}
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, method === 'email' && styles.toggleBtnActive]}
                onPress={() => switchMethod('email')}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleText, method === 'email' && styles.toggleTextActive]}>
                  ✉️  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, method === 'phone' && styles.toggleBtnActive]}
                onPress={() => switchMethod('phone')}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleText, method === 'phone' && styles.toggleTextActive]}>
                  📱  Phone OTP
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Email form ─────────────────────────────────────────── */}
            <AnimatePresence exitBeforeEnter>
              {method === 'email' && (
                <MotiView
                  key="email"
                  from={{ opacity: 0, translateX: -16 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  exit={{ opacity: 0, translateX: -16 }}
                  transition={{ type: 'timing', duration: 220 }}
                >
                  <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>Email address</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="you@school.com"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>Password</Text>
                    <View style={styles.pwdRow}>
                      <TextInput
                        style={[styles.input, styles.pwdInput]}
                        placeholder="Enter password"
                        placeholderTextColor={COLORS.textMuted}
                        secureTextEntry={!showPwd}
                        returnKeyType="done"
                        onSubmitEditing={handleEmailLogin}
                        value={password}
                        onChangeText={setPassword}
                      />
                      <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowPwd(v => !v)}
                      >
                        <Text style={styles.eyeIcon}>{showPwd ? '🙈' : '👁️'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <PrimaryButton
                    label="Sign In"
                    onPress={handleEmailLogin}
                    busy={busy}
                  />
                </MotiView>
              )}

              {/* ── Phone / OTP form ──────────────────────────────────── */}
              {method === 'phone' && (
                <MotiView
                  key="phone"
                  from={{ opacity: 0, translateX: 16 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  exit={{ opacity: 0, translateX: 16 }}
                  transition={{ type: 'timing', duration: 220 }}
                >
                  <AnimatePresence exitBeforeEnter>
                    {step === 'phone' ? (
                      <MotiView
                        key="enterPhone"
                        from={{ opacity: 0, translateX: -12 }}
                        animate={{ opacity: 1, translateX: 0 }}
                        exit={{ opacity: 0, translateX: -12 }}
                        transition={{ type: 'timing', duration: 200 }}
                      >
                        <View style={styles.fieldWrap}>
                          <Text style={styles.fieldLabel}>Mobile number</Text>
                          <View style={styles.phoneRow}>
                            <View style={styles.countryCode}>
                              <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                            </View>
                            <TextInput
                              style={styles.phoneInput}
                              placeholder="XXXXX XXXXX"
                              placeholderTextColor={COLORS.textMuted}
                              keyboardType="phone-pad"
                              returnKeyType="done"
                              onSubmitEditing={handleSendOtp}
                              maxLength={10}
                              value={phone}
                              onChangeText={setPhone}
                            />
                          </View>
                        </View>
                        <PrimaryButton label="Send OTP" onPress={handleSendOtp} busy={busy} />
                      </MotiView>
                    ) : (
                      <MotiView
                        key="enterOtp"
                        from={{ opacity: 0, translateX: 12 }}
                        animate={{ opacity: 1, translateX: 0 }}
                        exit={{ opacity: 0, translateX: 12 }}
                        transition={{ type: 'timing', duration: 200 }}
                      >
                        <Text style={styles.otpHint}>OTP sent to +91 {phone}</Text>
                        <View style={styles.otpRow}>
                          {otp.map((digit, idx) => (
                            <TextInput
                              key={idx}
                              ref={r => { otpRefs.current[idx] = r; }}
                              style={[styles.otpBox, digit && styles.otpBoxFilled]}
                              value={digit}
                              onChangeText={v => handleOtpChange(v, idx)}
                              onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, idx)}
                              keyboardType="number-pad"
                              maxLength={1}
                              selectTextOnFocus
                            />
                          ))}
                        </View>
                        <PrimaryButton
                          label="Verify & Sign In"
                          onPress={handleVerifyOtp}
                          busy={busy}
                          disabled={otp.join('').length < 6}
                        />
                        <TouchableOpacity
                          style={styles.backLink}
                          onPress={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); }}
                        >
                          <Text style={styles.backLinkText}>← Change number</Text>
                        </TouchableOpacity>
                      </MotiView>
                    )}
                  </AnimatePresence>
                </MotiView>
              )}
            </AnimatePresence>
          </MotiView>

          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', delay: 700, duration: 600 }}
          >
            <Text style={styles.footer}>Secure · Encrypted · Trusted by schools</Text>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Shared primary button ────────────────────────────────────────────────────
function PrimaryButton({
  label, onPress, busy, disabled,
}: {
  label: string; onPress: () => void; busy?: boolean; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.btn, (busy || disabled) && styles.btnDisabled]}
      onPress={onPress}
      disabled={busy || disabled}
      activeOpacity={0.85}
    >
      <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.btnGradient}>
        {busy ? (
          <MotiView
            from={{ rotate: '0deg' }}
            animate={{ rotate: '360deg' }}
            transition={{ loop: true, type: 'timing', duration: 900 }}
            style={styles.spinner}
          />
        ) : (
          <Text style={styles.btnText}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  kav:  { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingVertical: 40 },

  glowOrb: {
    position: 'absolute', width: 400, height: 400,
    borderRadius: 200, backgroundColor: COLORS.brand,
    top: -100, right: -100,
  },

  // Logo
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 68, height: 68, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: COLORS.gold, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
  },
  logoY:        { ...FONTS.xbold, color: '#fff', fontSize: 34 },
  brandName:    { ...FONTS.xbold, color: COLORS.white, fontSize: 26, letterSpacing: 8, textAlign: 'center' },
  brandTagline: { ...FONTS.regular, color: COLORS.textMuted, fontSize: 12, textAlign: 'center', letterSpacing: 2, marginTop: 4 },

  // Card
  card: {
    width: '100%', maxWidth: 380,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl, padding: 24,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    shadowColor: COLORS.brand, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8,
  },
  cardTitle: { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: 4 },
  cardSub:   { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },

  // Toggle
  toggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: 4, marginBottom: 22,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 10,
    alignItems: 'center', borderRadius: RADIUS.md,
  },
  toggleBtnActive: { backgroundColor: COLORS.brand },
  toggleText:      { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  toggleTextActive:{ color: COLORS.white },

  // Fields
  fieldWrap:  { marginBottom: 16 },
  fieldLabel: { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginBottom: 7 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    paddingHorizontal: 14, paddingVertical: 13,
    color: COLORS.text, fontSize: 15,
  },
  pwdRow:  { position: 'relative' },
  pwdInput:{ paddingRight: 48 },
  eyeBtn:  { position: 'absolute', right: 12, top: 10 },
  eyeIcon: { fontSize: 20 },

  // Phone
  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.cardBorder, overflow: 'hidden',
  },
  countryCode: {
    paddingHorizontal: 12, paddingVertical: 13,
    borderRightWidth: 1, borderRightColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
  },
  countryCodeText: { ...FONTS.medium, color: COLORS.text, fontSize: 14 },
  phoneInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 13,
    color: COLORS.text, fontSize: 15, ...FONTS.medium,
  },

  // OTP
  otpHint: { ...FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginBottom: 16, textAlign: 'center' },
  otpRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  otpBox: {
    width: 44, height: 54,
    borderRadius: RADIUS.md, backgroundColor: COLORS.surface,
    borderWidth: 1.5, borderColor: COLORS.cardBorder,
    textAlign: 'center', fontSize: 22, ...FONTS.bold, color: COLORS.text,
  },
  otpBoxFilled: { borderColor: COLORS.brand, backgroundColor: COLORS.brand + '22' },

  // Button
  btn: { borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: 8 },
  btnDisabled: { opacity: 0.55 },
  btnGradient: { paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  btnText:     { ...FONTS.bold, color: COLORS.white, fontSize: 16 },
  spinner: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2.5, borderColor: COLORS.white, borderTopColor: 'transparent',
  },

  backLink:     { alignItems: 'center', marginTop: 6 },
  backLinkText: { ...FONTS.medium, color: COLORS.brand, fontSize: 14 },

  footer: { ...FONTS.regular, color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 28, letterSpacing: 0.5 },
});
