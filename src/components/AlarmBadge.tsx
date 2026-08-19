import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatTime12 } from '../lib/timeFormat';
import { colors } from '../theme';
import type { HabitReminder } from '../types';

interface Props {
  reminders: HabitReminder[];
  onPress: () => void;
  /** Cards give it a filled pill; the grid keeps it inline and lighter. */
  variant?: 'pill' | 'inline';
}

/**
 * The alarm control for a habit. Rendered whether or not an alarm is set —
 * an unset habit still needs somewhere to tap to add one — and coloured only
 * when there's actually an alarm, so a glance down the list shows which
 * habits will ring.
 */
export function AlarmBadge({ reminders, onPress, variant = 'inline' }: Props) {
  const isSet = reminders.length > 0;
  const earliest = isSet
    ? [...reminders].sort((a, b) => a.time.localeCompare(b.time))[0]
    : null;
  const label = !isSet
    ? 'Set alarm'
    : reminders.length > 1
      ? `${formatTime12(earliest!.time)} +${reminders.length - 1}`
      : formatTime12(earliest!.time);

  const tint = isSet ? colors.accent : colors.textSecondary;

  if (variant === 'pill') {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={10}
        style={[styles.pill, isSet ? styles.pillSet : styles.pillUnset]}
      >
        <MaterialCommunityIcons name="alarm" size={22} color={tint} />
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.inline}>
      <MaterialCommunityIcons name="alarm" size={17} color={tint} />
      <Text style={[styles.label, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  label: { fontSize: 13, fontWeight: '600', minWidth: 92 },
  pill: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSet: { backgroundColor: colors.accentFaint },
  pillUnset: { backgroundColor: colors.surfaceMuted },
});
