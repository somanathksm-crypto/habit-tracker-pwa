import { addDays, addMonths, differenceInCalendarDays, endOfMonth, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors, type Colors } from '../theme';
import type { HabitLog } from '../types';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const GAP = 6;

interface Props {
  logs: HabitLog[];
  accent: string;
  viewMonth: Date;
  onChangeMonth: (month: Date) => void;
}

export function CalendarHeatmap({ logs, accent, viewMonth, onChangeMonth }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const completed = new Set(logs.filter((l) => l.completed).map((l) => l.log_date));
  const today = new Date();
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const isCurrentMonth = isSameMonth(viewMonth, today);

  const weeksCount = Math.ceil((differenceInCalendarDays(monthEnd, gridStart) + 1) / 7);
  const rows: Date[][] = Array.from({ length: weeksCount }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(gridStart, w * 7 + d))
  );

  return (
    <View>
      <View style={styles.monthRow}>
        <Pressable hitSlop={10} onPress={() => onChangeMonth(addMonths(viewMonth, -1))}>
          <Text style={styles.monthArrow}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{format(viewMonth, 'MMMM yyyy')}</Text>
        <Pressable hitSlop={10} disabled={isCurrentMonth} onPress={() => onChangeMonth(addMonths(viewMonth, 1))}>
          <Text style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        {DAY_LABELS.map((label, i) => (
          <Text key={i} style={styles.dayLabel}>
            {label}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={[styles.row, ri > 0 && { marginTop: GAP }]}>
          {row.map((date, di) => {
            const inMonth = date >= monthStart && date <= monthEnd;
            if (!inMonth) return <View key={di} style={styles.cellSlot} />;
            const key = format(date, 'yyyy-MM-dd');
            const isFuture = date > today;
            const isDone = completed.has(key);
            return (
              <View key={di} style={styles.cellSlot}>
                <View
                  style={[
                    styles.cell,
                    { backgroundColor: isFuture ? colors.surfaceMuted : isDone ? accent : colors.accentFaint },
                  ]}
                />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  monthArrow: { fontSize: 20, color: colors.accent, fontWeight: '700', paddingHorizontal: 16 },
  monthArrowDisabled: { color: colors.textFaint },
  monthLabel: { fontSize: 14, fontWeight: '700', color: colors.text, minWidth: 120, textAlign: 'center' },
  row: { flexDirection: 'row' },
  cellSlot: { flex: 1, aspectRatio: 1, paddingHorizontal: GAP / 2 },
  cell: { flex: 1, borderRadius: 6 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textFaint, marginBottom: 8 },
});
