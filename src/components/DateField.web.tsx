import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { colors } from '../theme';

interface Props {
  value: string; // 'yyyy-MM-dd'
  onChange: (date: string) => void;
}

/**
 * Web build of the date field — the native picker package has no web support,
 * so this is a plain typed field. Kept as a `.web.tsx` sibling so Metro never
 * pulls the native module into the web bundle.
 */
export function DateField({ value, onChange }: Props) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      maxLength={10}
      style={styles.field}
    />
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: colors.accentFaint,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
    minWidth: 130,
  },
});
