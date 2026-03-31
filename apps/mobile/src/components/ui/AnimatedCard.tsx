import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { COLORS, RADIUS, SHADOW } from '../../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
  index?: number;
}

export function AnimatedCard({ children, style, delay = 0, index = 0 }: Props) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'spring',
        delay: delay + index * 80,
        damping: 18,
        stiffness: 120,
      }}
      style={[styles.card, style]}
    >
      {children}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 12,
    ...SHADOW.sm,
  },
});
