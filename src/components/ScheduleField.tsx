import { addDays, format, startOfMonth, startOfWeek } from 'date-fns';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { describeSchedule } from '../lib/habitSchedule';
import { useColors, type Colors } from '../theme';
import type { HabitSchedule } from '../types';

interface Props {
  value: HabitSchedule;
  onChange: (next: HabitSchedule) => void;
}

const PERIODS: { value: HabitSchedule['period']; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'custom', label: 'Custom' },
];

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_TIMES = 12;

function defaultFor(period: HabitSchedule['period']): HabitSchedule {
  if (period === 'day') return { period: 'day' };
  if (period === 'week') return { period: 'week', times: 1, weekdays: [] };
  return { period: 'custom', dates: [] };
}

/** When a habit is due: every day, on chosen weekdays, or on specific dates. */
export function ScheduleField({ value, onChange }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      <View style={styles.periodRow}>
        {PERIODS.map((p) => {
          const active = value.period === p.value;
          return (
            <Pressable
              key={p.value}
              onPress={() => onChange(defaultFor(p.value))}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {value.period === 'day' && <Text style={styles.hint}>Due every day.</Text>}

      {value.period === 'week' && <WeekPicker value={value} onChange={onChange} />}
      {value.period === 'custom' && <DatePicker value={value} onChange={onChange} />}

      <Text style={styles.summary}>{describeSchedule(value)}</Text>
    </View>
  );
}

function Counter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const times = Math.max(1, value);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => onChange(Math.max(1, times - 1))} hitSlop={8} style={styles.stepper}>
        <Text style={styles.stepperText}>−</Text>
      </Pressable>
      <Text style={styles.count}>{times}</Text>
      <Pressable
        onPress={() => onChange(Math.min(MAX_TIMES, times + 1))}
        hitSlop={8}
        style={styles.stepper}
      >
        <Text style={styles.stepperText}>+</Text>
      </Pressable>
    </View>
  );
}

/** Specific weekdays, or any N days if none are chosen. */
function WeekPicker({
  value,
  onChange,
}: {
  value: Extract<HabitSchedule, { period: 'week' }>;
  onChange: (next: HabitSchedule) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const toggle = (day: number) => {
    const has = value.weekdays.includes(day);
    const weekdays = has ? value.weekdays.filter((d) => d !== day) : [...value.weekdays, day];
    onChange({ ...value, weekdays });
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.weekRow}>
        {DAY_LETTERS.map((letter, day) => {
          const active = value.weekdays.includes(day);
          return (
            <Pressable
              key={day}
              onPress={() => toggle(day)}
              style={[styles.dayBox, active && styles.dayBoxActive]}
            >
              <Text style={[styles.dayText, active && styles.dayTextActive]}>{letter}</Text>
            </Pressable>
          );
        })}
      </View>
      {value.weekdays.length === 0 && (
        <Counter
          label="Any days a week"
          value={value.times}
          onChange={(times) => onChange({ ...value, times })}
        />
      )}
      <Text style={styles.hint}>
        {value.weekdays.length > 0
          ? 'Only these days count — the rest are not misses.'
          : 'Pick days above, or leave blank for any days.'}
      </Text>
    </View>
  );
}

/** Specific dates. Past dates drop off, so the habit stops asking for them. */
function DatePicker({
  value,
  onChange,
}: {
  value: Extract<HabitSchedule, { period: 'custom' }>;
  onChange: (next: HabitSchedule) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  // Six rows of seven covers any month, Monday-first to match the grid.
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const toggle = (key: string) => {
    const has = value.dates.includes(key);
    const dates = has ? value.dates.filter((d) => d !== key) : [...value.dates, key];
    onChange({ period: 'custom', dates: dates.sort() });
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.monthRow}>
        <Pressable hitSlop={10} onPress={() => setMonth((m) => addDays(startOfMonth(m), -1))}>
          <Text style={styles.monthArrow}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{format(month, 'MMMM yyyy')}</Text>
        <Pressable hitSlop={10} onPress={() => setMonth((m) => addDays(startOfMonth(m), 32))}>
          <Text style={styles.monthArrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.calendar}>
        {cells.map((date, i) => {
          const key = format(date, 'yyyy-MM-dd');
          const inMonth = date.getMonth() === month.getMonth();
          const picked = value.dates.includes(key);
          const past = key < todayKey;
          return (
            <Pressable
              key={i}
              disabled={past}
              onPress={() => toggle(key)}
              style={[
                styles.cell,
                picked && styles.cellPicked,
                !inMonth && styles.cellOutside,
                past && styles.cellPast,
              ]}
            >
              <Text style={[styles.cellText, picked && styles.cellTextPicked]}>
                {date.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.hint}>Only these dates — it finishes once they've passed.</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
    marginTop: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  periodRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  label: { fontSize: 13, color: colors.textSecondary, minWidth: 120 },
  stepper: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.accentFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { fontSize: 19, fontWeight: '700', color: colors.accent, minWidth: 14, textAlign: 'center' },
  count: { fontSize: 17, fontWeight: '700', color: colors.text, minWidth: 26, textAlign: 'center' },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentMedium },
  // Sized past the longest label ('Custom'). Android under-measures short Text
  // by roughly a character, so an exact-fit minWidth silently truncates.
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, minWidth: 62, textAlign: 'center' },
  chipTextActive: { color: colors.accent },
  weekRow: { flexDirection: 'row', gap: 6 },
  dayBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: colors.accentFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBoxActive: { backgroundColor: colors.accentMedium },
  dayText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, minWidth: 14, textAlign: 'center' },
  dayTextActive: { color: colors.accentInk },
  hint: { fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  monthArrow: { fontSize: 20, color: colors.accent, fontWeight: '700', paddingHorizontal: 10 },
  monthLabel: { fontSize: 14, fontWeight: '700', color: colors.text, minWidth: 140, textAlign: 'center' },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: {
    width: 38,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  cellPicked: { backgroundColor: colors.accentMedium },
  cellOutside: { opacity: 0.35 },
  cellPast: { opacity: 0.3 },
  cellText: { fontSize: 13, fontWeight: '600', color: colors.text, minWidth: 22, textAlign: 'center' },
  cellTextPicked: { color: colors.accentInk },
  summary: { fontSize: 13, fontWeight: '700', color: colors.accent, minWidth: 120 },
});
