import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { addDays, format, isAfter, isBefore, isSameDay, parseISO, startOfDay, startOfWeek } from 'date-fns';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { FAB } from 'react-native-paper';
import { AlarmBadge } from '../components/AlarmBadge';
import { useData } from '../lib/store';
import { currentStreak } from '../lib/stats';
import { colors } from '../theme';
import type { TodayStackParamList } from '../navigation/types';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Props = NativeStackScreenProps<TodayStackParamList, 'Today'>;

/**
 * Week-at-a-glance grid. Each habit is a block — name, then its alarm and
 * streak, then the seven days across the full width — rather than one cramped
 * line. Giving the boxes the whole width is what makes them big enough to hit,
 * and it removes the fixed column widths that used to have to add up exactly.
 *
 * Same editing rule as everywhere else: only today can be toggled.
 */
const SIDE_PADDING = 16;
const COL_GAP = 9;

export function HabitGridScreen({ navigation }: Props) {
  const { habits, habitLogs, toggleHabitLog, logsForHabit, remindersForHabit } = useData();
  const { width } = useWindowDimensions();

  // Column width is computed rather than left to `flex: 1`. Flex children stop
  // sharing the row correctly inside the pinned-header wrapper — the day
  // letters ended up stacked in a single column — and an explicit width
  // behaves the same on every platform.
  const colWidth = Math.floor((width - SIDE_PADDING * 2 - COL_GAP * 6) / 7);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const [weekStart, setWeekStart] = useState(thisWeekStart);

  const isCurrentWeek = isSameDay(weekStart, thisWeekStart);
  const weekEnd = addDays(weekStart, 6);
  const weekDates = DAY_LETTERS.map((_, i) => addDays(weekStart, i));

  const rangeLabel =
    format(weekStart, 'MMM') === format(weekEnd, 'MMM')
      ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'd')}`
      : `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`;

  const completed = new Set(
    habitLogs.filter((l) => l.completed).map((l) => `${l.habit_id}|${l.log_date}`)
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Habits</Text>
        <View style={styles.weekRow}>
          <Pressable hitSlop={10} onPress={() => setWeekStart((w) => addDays(w, -7))}>
            <Text style={styles.weekArrow}>‹</Text>
          </Pressable>
          <View style={styles.weekLabelWrap}>
            <Text style={styles.weekLabel}>{rangeLabel}</Text>
            <Text style={styles.weekSub}>{isCurrentWeek ? 'This week' : format(weekStart, 'yyyy')}</Text>
          </View>
          <Pressable hitSlop={10} disabled={isCurrentWeek} onPress={() => setWeekStart((w) => addDays(w, 7))}>
            <Text style={[styles.weekArrow, isCurrentWeek && styles.weekArrowDisabled]}>›</Text>
          </Pressable>
        </View>
      </View>

      {habits.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No habits yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the + button below to add your first habit — diet, skincare, supplements, or
            anything else you want to track daily.
          </Text>
        </View>
      ) : (
        <>
          {/* Outside the scroll view on purpose. Inside it as a sticky header,
              the wrapper stopped the row laying out horizontally and the day
              letters stacked into a single column on device — while looking
              correct in a browser. Sitting above the list keeps them visible
              with no wrapper involved. */}
          <View style={styles.dayHeader}>
            {weekDates.map((date, i) => (
              <View key={i} style={[styles.dayCol, { width: colWidth }]}>
                <Text
                  style={[
                    styles.dayLetter,
                    format(date, 'yyyy-MM-dd') === todayStr && styles.dayLetterToday,
                  ]}
                >
                  {DAY_LETTERS[i]}
                </Text>
              </View>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.content}>

          {habits.map((habit) => {
            const created = startOfDay(parseISO(habit.created_at));
            const streak = currentStreak(logsForHabit(habit.id));
            return (
              <View key={habit.id} style={styles.habitBlock}>
                <Pressable onPress={() => navigation.navigate('HabitDetail', { habitId: habit.id })}>
                  <Text style={styles.habitName}>{habit.name}</Text>
                </Pressable>

                <View style={styles.metaRow}>
                  <AlarmBadge
                    reminders={remindersForHabit(habit.id)}
                    onPress={() => navigation.navigate('AddEditHabit', { habitId: habit.id })}
                  />
                  {streak > 0 && (
                    <View style={styles.streak}>
                      <Text style={styles.streakEmoji}>🔥</Text>
                      <Text style={styles.streakText}>{streak}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.boxRow}>
                  {weekDates.map((date, i) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isToday = dateStr === todayStr;
                    const done = completed.has(`${habit.id}|${dateStr}`);
                    const notApplicable =
                      (isAfter(date, today) && !isToday) || isBefore(date, created);
                    return (
                      <Pressable
                        key={i}
                        disabled={!isToday}
                        onPress={() => toggleHabitLog(habit.id, dateStr)}
                        style={[styles.dayCol, { width: colWidth }]}
                      >
                        <View
                          style={[
                            styles.box,
                            { width: colWidth, height: colWidth },
                            done ? styles.boxDone : notApplicable ? styles.boxFaded : styles.boxEmpty,
                            isToday && styles.boxToday,
                          ]}
                        >
                          {done && (
                            <MaterialCommunityIcons name="check" size={22} color={colors.accentInk} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              );
            })}
          </ScrollView>
        </>
      )}

      <FAB
        icon="plus"
        label="Add Habit"
        style={styles.fab}
        color="#fff"
        onPress={() => navigation.navigate('AddEditHabit', {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  weekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  weekArrow: { fontSize: 22, color: colors.accent, fontWeight: '700', paddingHorizontal: 18 },
  weekArrowDisabled: { color: colors.textFaint },
  weekLabelWrap: { alignItems: 'center', minWidth: 130 },
  weekLabel: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center', minWidth: 130 },
  weekSub: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', minWidth: 130, marginTop: 1 },
  content: { paddingHorizontal: SIDE_PADDING, paddingBottom: 110 },

  dayHeader: {
    flexDirection: 'row',
    gap: COL_GAP,
    backgroundColor: colors.background,
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayCol: { alignItems: 'center' },
  dayLetter: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    minWidth: 16,
  },
  dayLetterToday: { color: colors.accent },

  habitBlock: { paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  habitName: { fontSize: 16, fontWeight: '600', color: colors.text, lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 5, marginBottom: 9 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  streakEmoji: { fontSize: 13 },
  streakText: { fontSize: 13, fontWeight: '700', color: colors.clay, minWidth: 16 },

  boxRow: { flexDirection: 'row', gap: COL_GAP },
  // Every box is outlined. Fill alone was nearly the same value as the page,
  // so an empty week read as blank space rather than seven unticked days.
  box: {
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxDone: { backgroundColor: colors.accentMedium, borderColor: colors.accentMedium },
  boxEmpty: { backgroundColor: colors.surface, borderColor: colors.accentSoft },
  boxFaded: { backgroundColor: colors.accentFaint, borderColor: colors.border, opacity: 0.5 },
  boxToday: { borderWidth: 2.5, borderColor: colors.accentMedium },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  fab: { position: 'absolute', right: 16, bottom: 20, backgroundColor: colors.accent },
});
