import React, { useMemo } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { useColors, type Colors } from '../theme';

interface Props {
  value: string; // 'HH:mm'
  onChange: (time: string) => void;
}

/**
 * Web build of the time field. The native picker package has no web support,
 * so this is a plain typed field — kept in a `.web.tsx` sibling so Metro never
 * pulls the native module into the web bundle (or vice versa).
 */
export function TimeField({ value, onChange }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="HH:mm"
      maxLength={5}
      style={styles.field}
    />
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  field: {
    backgroundColor: colors.accentFaint,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
    minWidth: 86,
  },
});
