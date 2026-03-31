import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/context/AuthContext';
import { requestOtp } from '../../src/api/client';
import { COLORS, FONTS, RADIUS } from '../../src/theme';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { login }             = useAuth();
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState(['', '', '', '', '', '']);
  const [step, setStep]       = useState<'phone' | 'otp'>('phone');
  const [busy, setBusy]       = useState(false);
  const otpRefs               = useRef<(TextInput | null)[]>([]);

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

  async function handleVerify() {
    const code = otp.join('');
    if (code.length < 6) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusy(true);
    try {
      await login(phone.trim(), code);
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
      // Handle paste
      const arr = digits.slice(0, 6).split('');
      const next = [...otp];
      arr.forEach((d, i) => { if (i < 6) next[i] = d; });
      setOtp(next);
      const focusIdx = Math.min(arr.length, 5);
      otpRefs.current[focusIdx]?.focus();
      return;
    }
    const next = [...otp];
    next[idx] = digits;
    setOtp(next);
    if (digits && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKeyPress(key: string, idx: number) {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      const next = [...otp];
      next[idx - 1] = '';
      setOtp(next);
      otpRefs.current[idx - 1]?.focus();
    }
  }

  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    }
  }, [step]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.bg, '#071020', '#0a1628']}
        style={StyleSheet.absoluteFill}
      />
      {/* Glow orb */}
      <MotiView
        from={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ type: 'timing', duration: 1200 }}
        style={styles.glowOrb}
      />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Logo section */}
        <MotiView
          from={{ opacity: 0, translateY: -30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 100, damping: 18 }}
          style={styles.logoSection}
        >
          <LinearGradient
            colors={[COLORS.gold, '#e8c07a', COLORS.gold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoCircle}
          >
            <Text style={styles.logoY}>Y</Text>
          </LinearGradient>
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 250, damping: 14 }}
          >
            <Text style={styles.brandName}>YULAA</Text>
            <Text style={styles.brandTagline}>School Management System</Text>
          </MotiView>
        </MotiView>

        {/* Card */}
        <MotiView
          from={{ opacity: 0, translateY: 40 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 300, damping: 18, stiffness: 100 }}
          style={styles.card}
        >
          <AnimatePresence exitBeforeEnter>
            {step === 'phone' ? (
              <MotiView
                key="phone"
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                exit={{ opacity: 0, translateX: -20 }}
                transition={{ type: 'timing', duration: 250 }}
              >
                <Text style={styles.stepTitle}>Welcome back</Text>
                <Text style={styles.stepSub}>Enter your registered mobile number</Text>

                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="XXXXX XXXXX"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    returnKeyType="done"
                    onSubmitEditing={handleSendOtp}
                    maxLength={10}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.btn, busy && styles.btnDisabled]}
                  onPress={handleSendOtp}
                  disabled={busy}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[COLORS.brand, COLORS.brandDark]}
                    style={styles.btnGradient}
                  >
                    {busy ? (
                      <View style={styles.spinnerWrap}>
                        <MotiView
                          from={{ rotate: '0deg' }}
                          animate={{ rotate: '360deg' }}
                          transition={{ loop: true, type: 'timing', duration: 900 }}
                          style={styles.spinner}
                        />
                      </View>
                    ) : (
                      <Text style={styles.btnText}>Send OTP</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </MotiView>
            ) : (
              <MotiView
                key="otp"
                from={{ opacity: 0, translateX: 20 }}
                animate={{ opacity: 1, translateX: 0 }}
                exit={{ opacity: 0, translateX: 20 }}
                transition={{ type: 'timing', duration: 250 }}
              >
                <Text style={styles.stepTitle}>Enter OTP</Text>
                <Text style={styles.stepSub}>Sent to +91 {phone}</Text>

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

                <TouchableOpacity
                  style={[styles.btn, (busy || otp.join('').length < 6) && styles.btnDisabled]}
                  onPress={handleVerify}
                  disabled={busy || otp.join('').length < 6}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[COLORS.brand, COLORS.brandDark]}
                    style={styles.btnGradient}
                  >
                    {busy ? (
                      <View style={styles.spinnerWrap}>
                        <MotiView
                          from={{ rotate: '0deg' }}
                          animate={{ rotate: '360deg' }}
                          transition={{ loop: true, type: 'timing', duration: 900 }}
                          style={styles.spinner}
                        />
                      </View>
                    ) : (
                      <Text style={styles.btnText}>Verify & Sign In</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

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

        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', delay: 600, duration: 600 }}
        >
          <Text style={styles.footer}>Secure · Encrypted · Trusted by schools</Text>
        </MotiView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  kav:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  glowOrb: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: COLORS.brand,
    top: -100,
    right: -100,
  },

  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  logoY:        { ...FONTS.xbold, color: '#fff', fontSize: 36 },
  brandName:    { ...FONTS.xbold, color: COLORS.white, fontSize: 28, letterSpacing: 8, textAlign: 'center' },
  brandTagline: { ...FONTS.regular, color: COLORS.textMuted, fontSize: 12, textAlign: 'center', letterSpacing: 2, marginTop: 4 },

  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },

  stepTitle: { ...FONTS.bold, fontSize: 22, color: COLORS.text, marginBottom: 6 },
  stepSub:   { ...FONTS.regular, fontSize: 14, color: COLORS.textMuted, marginBottom: 24, lineHeight: 20 },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 20,
    overflow: 'hidden',
  },
  countryCode: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
  },
  countryCodeText: { ...FONTS.medium, color: COLORS.text, fontSize: 15 },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16,
    ...FONTS.medium,
  },

  otpRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    textAlign: 'center',
    fontSize: 22,
    ...FONTS.bold,
    color: COLORS.text,
  },
  otpBoxFilled: { borderColor: COLORS.brand, backgroundColor: COLORS.brand + '22' },

  btn: { borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: 8 },
  btnDisabled:  { opacity: 0.6 },
  btnGradient:  { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnText:      { ...FONTS.bold, color: COLORS.white, fontSize: 16 },

  spinnerWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  spinner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: COLORS.white,
    borderTopColor: 'transparent',
  },

  backLink:     { alignItems: 'center', marginTop: 8 },
  backLinkText: { ...FONTS.medium, color: COLORS.brand, fontSize: 14 },

  footer: { ...FONTS.regular, color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 32, letterSpacing: 0.5 },
});
