import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { MAX_MONTHLY_DAY, type HabitReminder, type ReminderRepeat } from '../types';
import { DateField } from './DateField';
import { TimeField } from './TimeField';

type Draft = Omit<HabitReminder, 'id' | 'habit_id'>;

interface Props {
  reminder: Draft;
  onChange: (next: Draft) => void;
  onRemove: () => void;
}

const KINDS: { value: ReminderRepeat['kind']; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'once', label: 'Once' },
];

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Switching kind keeps the time but resets the kind-specific part to a sane default. */
function defaultsFor(kind: ReminderRepeat['kind']): ReminderRepeat {
  if (kind === 'daily') return { kind: 'daily' };
  if (kind === 'weekly') return { kind: 'weekly', weekdays: [new Date().getDay()] };
  if (kind === 'monthly') return { kind: 'monthly', day: Math.min(new Date().getDate(), MAX_MONTHLY_DAY) };
  return { kind: 'once', date: todayString() };
}

export function ReminderRow({ reminder, onChange, onRemove }: Props) {
  const repeat = reminder.repeat;

  const toggleWeekday = (day: number) => {
    if (repeat.kind !== 'weekly') return;
    const has = repeat.weekdays.includes(day);
    const weekdays = has ? repeat.weekdays.filter((d) => d !== day) : [...repeat.weekdays, day];
    onChange({ ...reminder, repeat: { kind: 'weekly', weekdays } });
  };

  const stepMonthDay = (delta: number) => {
    if (repeat.kind !== 'monthly') return;
    const day = Math.min(MAX_MONTHLY_DAY, Math.max(1, repeat.day + delta));
    onChange({ ...reminder, repeat: { kind: 'monthly', day } });
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <TimeField value={reminder.time} onChange={(time) => onChange({ ...reminder, time })} />
        <Pressable onPress={onRemove} hitSlop={10} style={styles.remove}>
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      </View>

      <View style={styles.kindRow}>
        {KINDS.map((k) => {
          const active = repeat.kind === k.value;
          return (
            <Pressable
              key={k.value}
              onPress={() => onChange({ ...reminder, repeat: defaultsFor(k.value) })}
              style={[styles.kindChip, active && styles.kindChipActive]}
            >
              <Text style={[styles.kindText, active && styles.kindTextActive]}>{k.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {repeat.kind === 'weekly' && (
        <View style={styles.weekRow}>
          {DAY_LETTERS.map((letter, day) => {
            const active = repeat.weekdays.includes(day);
            return (
              <Pressable
                key={day}
                onPress={() => toggleWeekday(day)}
                style={[styles.dayBox, active && styles.dayBoxActive]}
              >
                <Text style={[styles.dayText, active && styles.dayTextActive]}>{letter}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {repeat.kind === 'weekly' && repeat.weekdays.length === 0 && (
        <Text style={styles.warn}>Pick at least one day, or this won't ring.</Text>
      )}

      {repeat.kind === 'monthly' && (
        <View style={styles.monthRow}>
          <Text style={styles.monthLabel}>Day of month</Text>
          <Pressable onPress={() => stepMonthDay(-1)} hitSlop={8} style={styles.stepper}>
            <Text style={styles.stepperText}>−</Text>
          </Pressable>
          <Text style={styles.monthValue}>{repeat.day}</Text>
          <Pressable onPress={() => stepMonthDay(1)} hitSlop={8} style={styles.stepper}>
            <Text style={styles.stepperText}>+</Text>
          </Pressable>
        </View>
      )}

      {repeat.kind === 'monthly' && repeat.day === MAX_MONTHLY_DAY && (
        <Text style={styles.hint}>Capped at 28 so it lands in every month, February included.</Text>
      )}

      {repeat.kind === 'once' && (
        <View style={styles.onceRow}>
          <DateField
            value={repeat.date}
            onChange={(date) => onChange({ ...reminder, repeat: { kind: 'once', date } })}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 10,
    gap: 10,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  remove: { paddingVertical: 6, paddingHorizontal: 4 },
  removeText: { fontSize: 13, fontWeight: '600', color: colors.danger, minWidth: 62 },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kindChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindChipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentMedium },
  kindText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, minWidth: 42, textAlign: 'center' },
  kindTextActive: { color: colors.accent },
  weekRow: { flexDirection: 'row', gap: 6 },
  dayBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accentFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBoxActive: { backgroundColor: colors.accentMedium },
  dayText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, minWidth: 14, textAlign: 'center' },
  dayTextActive: { color: colors.accentInk },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthLabel: { fontSize: 13, color: colors.textSecondary, minWidth: 92 },
  stepper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accentFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { fontSize: 18, fontWeight: '700', color: colors.accent, minWidth: 14, textAlign: 'center' },
  monthValue: { fontSize: 16, fontWeight: '700', color: colors.text, minWidth: 30, textAlign: 'center' },
  onceRow: { flexDirection: 'row', alignItems: 'center' },
  warn: { fontSize: 12, color: colors.danger, lineHeight: 16 },
  hint: { fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
});
