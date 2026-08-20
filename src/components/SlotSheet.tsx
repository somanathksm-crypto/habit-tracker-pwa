import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { isSlotClosed, slotsDoneOn, slotsOf } from '../lib/habitSchedule';
import { formatTime12 } from '../lib/timeFormat';
import { useColors, type Colors } from '../theme';
import type { Habit, HabitLog, HabitReminder } from '../types';

interface Props {
  habit: Habit | null;
  logs: HabitLog[];
  reminders: HabitReminder[];
  dateStr: string;
  onSetSlot: (slot: number, done: boolean) => void;
  onClose: () => void;
}

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

/**
 * Tick off each time of day separately, for a habit due more than once.
 *
 * The whole point is that "2 of 4" isn't enough — you need to see *which* one
 * you keep missing, which is why every slot gets its own row rather than a
 * counter.
 */
export function SlotSheet({ habit, logs, reminders, dateStr, onSetSlot, onClose }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!habit) return null;

  const slots = slotsOf(habit);
  const done = new Set(slotsDoneOn(logs, dateStr));
  const date = new Date(`${dateStr}T00:00:00`);
  const strict = (habit.slotDeadline ?? 'endOfDay') === 'onTime';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Swallow taps on the sheet itself so it doesn't close underneath you. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{habit.name}</Text>
          <Text style={styles.subtitle}>
            {done.size} of {slots.length} done
          </Text>

          <ScrollView style={styles.list} bounces={false}>
            {slots.map((slot) => {
              const isDone = done.has(slot);
              const time = reminders.find((r) => r.slot === slot)?.time;
              // Only meaningful in strict mode — with an end-of-day deadline
              // nothing is late until the day is over.
              const missed = !isDone && strict && isSlotClosed(habit, reminders, slot, date);

              return (
                <Pressable
                  key={slot}
                  style={[styles.row, missed && styles.rowMissed]}
                  onPress={() => onSetSlot(slot, !isDone)}
                >
                  <Text style={styles.ordinal}>{ORDINALS[slot - 1] ?? `${slot}`}</Text>
                  <View style={styles.rowMiddle}>
                    <Text style={styles.rowName}>{habit.name}</Text>
                    {time ? <Text style={styles.rowTime}>{formatTime12(time)}</Text> : null}
                  </View>
                  {missed ? <Text style={styles.missedTag}>Missed</Text> : null}
                  <View style={[styles.check, isDone && styles.checkOn]}>
                    {isDone && <MaterialCommunityIcons name="check" size={17} color={colors.accentInk} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: '#00000088',
      justifyContent: 'center',
      padding: 22,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      maxHeight: '78%',
    },
    title: { fontSize: 18, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2, minWidth: 90 },
    list: { marginTop: 12 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rowMissed: { opacity: 0.75 },
    ordinal: { fontSize: 13, fontWeight: '800', color: colors.textFaint, minWidth: 34 },
    rowMiddle: { flex: 1, minWidth: 0 },
    rowName: { fontSize: 14, fontWeight: '600', color: colors.text },
    rowTime: { fontSize: 12, fontWeight: '700', color: colors.alarm, marginTop: 1, minWidth: 70 },
    missedTag: { fontSize: 11, fontWeight: '700', color: colors.danger, minWidth: 52, textAlign: 'right' },
    check: {
      width: 28,
      height: 28,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.dayEmpty,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: colors.dayFilled, borderColor: colors.dayFilled },
    doneBtn: { marginTop: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.accentFaint },
    doneText: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: colors.accent, minWidth: 60 },
  });
