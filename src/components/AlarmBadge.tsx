import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { HabitReminder } from '../types';

interface Props {
  reminders: HabitReminder[];
  onPress: () => void;
  /** Cards have room for the time itself; the grid only has room for the bell. */
  showTime?: boolean;
}

/**
 * Bell shown on a habit that has alarms set — tapping it jumps to the habit's
 * reminder settings. Renders a fixed-size empty slot when there are no alarms
 * so rows stay aligned whether or not a habit has one.
 */
export function AlarmBadge({ reminders, onPress, showTime = false }: Props) {
  // The compact form keeps a fixed footprint whether or not it renders
  // anything, so grid columns line up across every row.
  if (reminders.length === 0) {
    return showTime ? null : <View style={styles.slot} />;
  }

  const earliest = [...reminders].sort((a, b) => a.time.localeCompare(b.time))[0];
  const label = reminders.length > 1 ? `${reminders.length}` : earliest.time;

  if (!showTime) {
    return (
      <Pressable onPress={onPress} hitSlop={10} style={styles.slot}>
        <MaterialCommunityIcons name="bell-outline" size={15} color={colors.accent} />
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.pill}>
      <MaterialCommunityIcons name="bell-outline" size={14} color={colors.accent} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const SLOT = 18;

const styles = StyleSheet.create({
  slot: { width: SLOT, minWidth: SLOT, alignItems: 'center', justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.accentFaint,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  label: { fontSize: 11, fontWeight: '700', color: colors.accent, minWidth: 34 },
});
