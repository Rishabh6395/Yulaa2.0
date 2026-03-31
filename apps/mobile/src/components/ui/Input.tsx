import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../../theme';

interface Props extends TextInputProps {
  label?: string;
  required?: boolean;
  error?: string;
}

export function Input({ label, required, error, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={{ color: COLORS.red }}> *</Text>}
        </Text>
      )}
      <TextInput
        {...rest}
        onFocus={e => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        placeholderTextColor={COLORS.textMuted}
        style={[
          styles.input,
          focused && styles.focused,
          error && styles.errored,
          style,
        ]}
      />
      {error && <Text style={styles.err}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { marginBottom: 14 },
  label:   { ...FONTS.medium, fontSize: 13, color: COLORS.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    padding: 13,
    color: COLORS.text,
    fontSize: 15,
  },
  focused: { borderColor: COLORS.brand },
  errored: { borderColor: COLORS.red },
  err:     { ...FONTS.regular, fontSize: 12, color: COLORS.red, marginTop: 4 },
});
