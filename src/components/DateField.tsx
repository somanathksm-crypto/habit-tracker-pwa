import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

interface Props {
  value: string; // 'yyyy-MM-dd'
  onChange: (date: string) => void;
}

function toDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

/** Tap to pick a date. A one-off alarm can't be set in the past. */
export function DateField({ value, onChange }: Props) {
  const [iosOpen, setIosOpen] = useState(false);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(value),
        mode: 'date',
        minimumDate: new Date(),
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(toDateString(date));
        },
      });
    } else {
      setIosOpen((o) => !o);
    }
  };

  return (
    <>
      <Pressable onPress={open} style={styles.field}>
        <Text style={styles.text}>{value}</Text>
      </Pressable>
      {iosOpen && Platform.OS === 'ios' && (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display="spinner"
          minimumDate={new Date()}
          onChange={(event, date) => {
            if (date) onChange(toDateString(date));
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: colors.accentFaint,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  text: { fontSize: 15, fontWeight: '700', color: colors.accent, minWidth: 96 },
});
