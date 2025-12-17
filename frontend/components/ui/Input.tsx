import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  variant?: 'default' | 'dark';
}

export default function Input({
  label,
  error,
  containerStyle,
  variant = 'default',
  ...textInputProps
}: InputProps) {
  const isDark = variant === 'dark';

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text>}
      <TextInput
        style={[styles.input, isDark && styles.inputDark, error && styles.inputError]}
        placeholderTextColor={isDark ? '#94A3B8' : '#94A3B8'}
        {...textInputProps}
      />
      {error && <Text style={[styles.error, isDark && styles.errorDark]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  labelDark: {
    color: '#E2E8F0',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  inputDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.2)',
    color: '#F8FAFC',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  error: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  errorDark: {
    color: '#FCA5A5',
  },
});
