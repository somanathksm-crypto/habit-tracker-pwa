import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors, type Colors } from '../theme';
import type { HabitReminder } from '../types';
import { TimeField } from './TimeField';

type Draft = Omit<HabitReminder, 'id' | 'habit_id'>;

interface Props {
  reminder: Draft;
  onChange: (next: Draft) => void;
  onRemove: () => void;
}

/**
 * A reminder is only a time. The days it rings on are the habit's own
 * schedule, set once above — which is why there are no repeat controls here.
 */
export function ReminderRow({ reminder, onChange, onRemove }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <TimeField value={reminder.time} onChange={(time) => onChange({ ...reminder, time })} />
      <Pressable onPress={onRemove} hitSlop={10} style={styles.remove}>
        <Text style={styles.removeText}>Remove</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remove: { paddingVertical: 6, paddingHorizontal: 4 },
  removeText: { fontSize: 13, fontWeight: '600', color: colors.danger, minWidth: 62 },
});
