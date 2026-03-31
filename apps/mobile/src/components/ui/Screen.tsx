import React from 'react';
import { View, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padding?: number;
  gradient?: boolean;
}

export function Screen({ children, scroll = true, padding = 20, gradient = false }: ScreenProps) {
  const content = scroll
    ? (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding, paddingBottom: 40 }}
      >
        {children}
      </ScrollView>
    )
    : <View style={{ flex: 1, padding }}>{children}</View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      {gradient
        ? <LinearGradient colors={[COLORS.bg, '#0a1628', COLORS.bg]} style={StyleSheet.absoluteFill} />
        : null}
      {content}
    </SafeAreaView>
  );
}
