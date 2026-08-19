import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { formatTime12 } from '../lib/timeFormat';
import { useColors, type Colors } from '../theme';

interface Props {
  value: string; // 'HH:mm'
  onChange: (time: string) => void;
}

function toDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function toTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Tap to pick a time. Android opens the system dialog; iOS reveals an inline spinner. */
export function TimeField({ value, onChange }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [iosOpen, setIosOpen] = useState(false);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(value),
        mode: 'time',
        is24Hour: false,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(toTimeString(date));
        },
      });
    } else {
      setIosOpen((o) => !o);
    }
  };

  return (
    <>
      <Pressable onPress={open} style={styles.field}>
        {/* Stored 24-hour, shown 12-hour with am/pm. */}
        <Text style={styles.text}>{formatTime12(value)}</Text>
      </Pressable>
      {iosOpen && Platform.OS === 'ios' && (
        <DateTimePicker
          value={toDate(value)}
          mode="time"
          display="spinner"
          onChange={(event, date) => {
            if (date) onChange(toTimeString(date));
          }}
        />
      )}
    </>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  field: {
    backgroundColor: colors.accentFaint,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  text: { fontSize: 16, fontWeight: '700', color: colors.accent, minWidth: 96 },
});
