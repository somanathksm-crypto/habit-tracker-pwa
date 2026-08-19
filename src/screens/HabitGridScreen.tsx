import { MaterialCommunityIcons } from '@expo/vector-icons';
import { addDays, format, isAfter, isBefore, parseISO, startOfDay, startOfWeek } from 'date-fns';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useData } from '../lib/store';
import { colors } from '../theme';

// Column headers exactly as they appear in the spreadsheet.
const DAY_HEADERS = ['M', 'T', 'W', 'TH', 'F', 'SAT', 'SUN'];

/**
 * Spreadsheet-style view of the current week: habits down the rows,
 * Monday–Sunday across the columns — mirrors the "DAILY HABITS" table.
 * Same editing rule as the Today tab: only today's column is tappable.
 */
export function HabitGridScreen() {
  const { habits, habitLogs, toggleHabitLog } = useData();

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDates = DAY_HEADERS.map((_, i) => addDays(weekStart, i));

  const completed = new Set(
    habitLogs.filter((l) => l.completed).map((l) => `${l.habit_id}|${l.log_date}`)
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Habits</Text>
        <Text style={styles.subtitle}>
          {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}
        </Text>
      </View>

      {habits.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No habits yet</Text>
          <Text style={styles.emptySubtitle}>
            Add habits from the Today tab and they'll show up here as rows.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <View style={styles.nameCell} />
              {weekDates.map((date, i) => {
                const isToday = format(date, 'yyyy-MM-dd') === todayStr;
                return (
                  <View key={i} style={styles.dayCell}>
                    <Text style={[styles.dayHeader, isToday && styles.dayHeaderToday]}>
                      {DAY_HEADERS[i]}
                    </Text>
                  </View>
                );
              })}
            </View>

            {habits.map((habit) => {
              const created = startOfDay(parseISO(habit.created_at));
              return (
                <View key={habit.id} style={styles.row}>
                  <View style={styles.nameCell}>
                    <Text style={styles.habitName}>{habit.name}</Text>
                  </View>
                  {weekDates.map((date, i) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isToday = dateStr === todayStr;
                    const done = completed.has(`${habit.id}|${dateStr}`);
                    // Faded for days the habit didn't exist yet, or hasn't happened.
                    const notApplicable =
                      (isAfter(date, today) && !isToday) || isBefore(date, created);
                    return (
                      <Text
                        key={i}
                        suppressHighlighting
                        onPress={isToday ? () => toggleHabitLog(habit.id, dateStr) : undefined}
                        style={[
                          styles.dayCell,
                          styles.cellBox,
                          done && styles.cellDone,
                          notApplicable && styles.cellFaded,
                          isToday && styles.cellToday,
                        ]}
                      >
                        {done ? (
                          <MaterialCommunityIcons name="check" size={16} color={colors.accentInk} />
                        ) : (
                          ''
                        )}
                      </Text>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const CELL = 30;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  table: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'stretch', borderTopWidth: 1, borderTopColor: colors.border },
  headerRow: { borderTopWidth: 0, backgroundColor: colors.accentFaint },
  nameCell: { flex: 1, minWidth: 0, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 10 },
  habitName: { fontSize: 13, color: colors.text, lineHeight: 17 },
  dayCell: {
    width: CELL,
    minWidth: CELL,
    minHeight: CELL + 8,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: CELL + 8,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  dayHeader: {
    width: '100%',
    minWidth: CELL,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    paddingVertical: 8,
  },
  dayHeaderToday: { color: colors.accent },
  cellBox: { backgroundColor: colors.surface },
  cellDone: { backgroundColor: colors.accentMedium },
  cellFaded: { backgroundColor: colors.accentFaint, opacity: 0.4 },
  cellToday: { borderLeftColor: colors.accentMedium },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
});
