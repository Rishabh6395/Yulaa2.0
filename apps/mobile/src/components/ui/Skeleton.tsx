import React from 'react';
import { View, ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { COLORS, RADIUS } from '../../theme';

export function Skeleton({
  width,
  height = 16,
  style,
}: {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
}) {
  return (
    <MotiView
      from={{ opacity: 0.4 }}
      animate={{ opacity: 0.9 }}
      transition={{ loop: true, type: 'timing', duration: 900 }}
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius: RADIUS.sm,
          backgroundColor: COLORS.surface,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
      }}
    >
      <Skeleton height={14} width="60%" style={{ marginBottom: 10 }} />
      <Skeleton height={12} width="40%" style={{ marginBottom: 6 }} />
      <Skeleton height={12} width="80%" />
    </View>
  );
}
