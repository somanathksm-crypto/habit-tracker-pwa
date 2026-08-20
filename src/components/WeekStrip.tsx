import { addDays, format, isAfter, isBefore, parseISO, startOfDay, startOfWeek } from 'date-fns';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors, type Colors } from '../theme';
import { slotsDoneOn, slotsOf } from '../lib/habitSchedule';
import { SlotFill } from './SlotFill';
import type { Habit, HabitLog } from '../types';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface Props {
  habit: Habit;
  logs: HabitLog[];
  createdAt: string;
  onToggleDay: (dateStr: string) => void;
}

/** Current calendar week (Monday–Sunday) — shows the week's completion at a glance; only today is tappable to toggle. */
export function WeekStrip({ habit, logs, createdAt, onToggleDay }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const completed = new Set(logs.filter((l) => l.completed).map((l) => l.log_date));
  const totalSlots = slotsOf(habit).length;
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const created = startOfDay(parseISO(createdAt));

  return (
    <View style={styles.row}>
      {DAY_LETTERS.map((letter, i) => {
        const date = addDays(weekStart, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const done = completed.has(dateStr);
        const future = isAfter(date, today) && dateStr !== todayStr;
        // Before the habit existed — same faded treatment as future days,
        // so it reads as "not applicable" rather than a genuine miss.
        const beforeCreation = isBefore(date, created);
        const notApplicable = future || beforeCreation;
        // Only today can be edited — past days are locked in as history.
        const disabled = dateStr !== todayStr;
        return (
          <Pressable
            key={dateStr}
            disabled={disabled}
            onPress={() => onToggleDay(dateStr)}
            hitSlop={4}
            style={styles.dayCol}
          >
            <SlotFill
              fraction={done ? 1 : slotsDoneOn(logs, dateStr).length / totalSlots}
              size={23}
              radius={6}
              muted={notApplicable}
            />
            <Text style={[styles.dayLabel, dateStr === todayStr && styles.dayLabelToday]}>{letter}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  row: { flexDirection: 'row' },
  dayCol: { alignItems: 'center', marginRight: 6, paddingVertical: 2, gap: 4 },
  dayLabel: { fontSize: 10, fontWeight: '600', color: colors.textFaint },
  dayLabelToday: { color: colors.accent },
});
