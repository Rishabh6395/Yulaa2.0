import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../src/context/AuthContext';
import { apiFetch } from '../../../src/api/client';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../../src/theme';

const ROLE_COLORS: Record<string, string> = {
  admin:         COLORS.red,
  principal:     COLORS.red,
  teacher:       COLORS.brand,
  parent:        COLORS.green,
  student:       COLORS.gold,
  super_admin:   '#8b5cf6',
  vendor:        COLORS.amber,
  consultant:    '#ec4899',
};

const ROLE_ICONS: Record<string, string> = {
  admin:       '⚙️',
  principal:   '🏫',
  teacher:     '👩‍🏫',
  parent:      '👨‍👩‍👧',
  student:     '🎓',
  super_admin: '🔐',
  vendor:      '🏪',
  consultant:  '💼',
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [busy, setBusy] = useState(false);

  const primaryRole = user?.primaryRole ?? 'teacher';
  const roleColor   = ROLE_COLORS[primaryRole] ?? COLORS.brand;
  const roleIcon    = ROLE_ICONS[primaryRole] ?? '👤';

  async function handleLogout() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  }

  async function handleChangePassword() {
    if (!currentPwd || !newPwd || !confirmPwd) {
      Alert.alert('Validation', 'All fields are required.');
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert('Validation', 'New passwords do not match.');
      return;
    }
    if (newPwd.length < 8) {
      Alert.alert('Validation', 'Password must be at least 8 characters.');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusy(true);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      Alert.alert('Success', 'Password changed successfully.');
      setShowChangePwd(false);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  }

  const menuItems = [
    {
      icon: '🔒',
      label: 'Change Password',
      sub: 'Update your account password',
      onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowChangePwd(true); },
    },
    {
      icon: '🔔',
      label: 'Notifications',
      sub: 'Manage notification preferences',
      onPress: () => Alert.alert('Coming Soon', 'Notification settings will be available in a future update.'),
    },
    {
      icon: 'ℹ️',
      label: 'About Yulaa',
      sub: 'Version 1.0.0',
      onPress: () => Alert.alert('Yulaa', 'School Management System\nVersion 1.0.0\n\n© 2024 Yulaa'),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Profile header */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 0, damping: 18 }}
          style={styles.headerCard}
        >
          <LinearGradient
            colors={[roleColor + '22', COLORS.card]}
            style={styles.headerGrad}
          >
            <LinearGradient
              colors={[roleColor, roleColor + 'cc']}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {(user?.name ?? 'U').charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <Text style={styles.name}>{user?.name ?? '—'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleIcon}>{roleIcon}</Text>
              <Text style={[styles.roleText, { color: roleColor }]}>
                {primaryRole.replace(/_/g, ' ')}
              </Text>
            </View>
            {user?.phone && (
              <Text style={styles.phone}>📱 {user.phone}</Text>
            )}
          </LinearGradient>
        </MotiView>

        {/* School info */}
        {(user?.schoolId || (user?.roles?.length ?? 0) > 0) && (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 80, damping: 18 }}
            style={styles.infoCard}
          >
            <Text style={styles.cardTitle}>School & Role</Text>
            {user?.roles?.map((role: any, i: number) => (
              <View key={i} style={styles.roleRow}>
                <View style={[styles.roleIndicator, { backgroundColor: ROLE_COLORS[role.role_code] ?? COLORS.brand }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleName}>{role.role_name ?? role.role_code}</Text>
                  {role.school_name && (
                    <Text style={styles.schoolName}>{role.school_name}</Text>
                  )}
                </View>
                {role.is_primary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>Primary</Text>
                  </View>
                )}
              </View>
            ))}
            {(!user?.roles || user.roles.length === 0) && (
              <InfoRow label="School ID" value={user?.schoolId} />
            )}
          </MotiView>
        )}

        {/* Menu items */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 140, damping: 18 }}
          style={styles.menuCard}
        >
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </MotiView>

        {/* Logout */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 200, damping: 18 }}
        >
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <LinearGradient
              colors={[COLORS.red + '22', COLORS.red + '11']}
              style={styles.logoutGrad}
            >
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Sign Out</Text>
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>

        <Text style={styles.version}>Yulaa School Management · v1.0.0</Text>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePwd}
        animationType="none"
        transparent
        onRequestClose={() => setShowChangePwd(false)}
      >
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowChangePwd(false)} />
          <AnimatePresence>
            {showChangePwd && (
              <MotiView
                from={{ translateY: 600 }}
                animate={{ translateY: 0 }}
                exit={{ translateY: 600 }}
                transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                style={styles.sheet}
              >
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Change Password</Text>

                <Input
                  label="Current Password"
                  required
                  placeholder="Enter current password"
                  value={currentPwd}
                  onChangeText={setCurrentPwd}
                  secureTextEntry
                />
                <Input
                  label="New Password"
                  required
                  placeholder="At least 8 characters"
                  value={newPwd}
                  onChangeText={setNewPwd}
                  secureTextEntry
                />
                <Input
                  label="Confirm New Password"
                  required
                  placeholder="Repeat new password"
                  value={confirmPwd}
                  onChangeText={setConfirmPwd}
                  secureTextEntry
                />

                <Button
                  label="Update Password"
                  onPress={handleChangePassword}
                  loading={busy}
                  style={{ marginTop: 8 }}
                />
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setShowChangePwd(false)}
                  style={{ marginTop: 8 }}
                />
              </MotiView>
            )}
          </AnimatePresence>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },

  headerCard: {
    borderRadius: RADIUS.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.cardBorder,
    marginBottom: 16, ...SHADOW.md,
  },
  headerGrad: { alignItems: 'center', padding: 28 },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, ...SHADOW.lg,
  },
  avatarText: { ...FONTS.xbold, fontSize: 36, color: COLORS.white },
  name:       { ...FONTS.xbold, fontSize: 22, color: COLORS.text, marginBottom: 8 },
  roleBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  roleIcon:   { fontSize: 16 },
  roleText:   { ...FONTS.bold, fontSize: 14, textTransform: 'capitalize' },
  phone:      { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted },

  infoCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    padding: 18, marginBottom: 14, ...SHADOW.sm,
  },
  cardTitle: { ...FONTS.bold, fontSize: 14, color: COLORS.text, marginBottom: 14 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  infoLabel: { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  infoValue: { ...FONTS.medium, fontSize: 13, color: COLORS.text },
  roleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  roleIndicator: { width: 8, height: 8, borderRadius: 4 },
  roleName:   { ...FONTS.bold, fontSize: 14, color: COLORS.text, textTransform: 'capitalize' },
  schoolName: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  primaryBadge: {
    backgroundColor: COLORS.brand + '22', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  primaryBadgeText: { ...FONTS.bold, fontSize: 11, color: COLORS.brand },

  menuCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    marginBottom: 14, overflow: 'hidden', ...SHADOW.sm,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 14,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  menuIcon:  { fontSize: 22, width: 30, textAlign: 'center' },
  menuText:  { flex: 1 },
  menuLabel: { ...FONTS.bold, fontSize: 15, color: COLORS.text },
  menuSub:   { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  menuArrow: { ...FONTS.bold, fontSize: 20, color: COLORS.textMuted },

  logoutBtn: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 24, ...SHADOW.sm },
  logoutGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 16,
    borderWidth: 1, borderColor: COLORS.red + '44', borderRadius: RADIUS.xl,
  },
  logoutIcon: { fontSize: 20 },
  logoutText: { ...FONTS.bold, fontSize: 16, color: COLORS.red },
  version:    { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.cardBorder,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: 20 },
});
