import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { addDays, format, isAfter, isBefore, isSameDay, parseISO, startOfDay, startOfWeek } from 'date-fns';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FAB } from 'react-native-paper';
import { useData } from '../lib/store';
import { currentStreak } from '../lib/stats';
import { colors } from '../theme';
import type { TodayStackParamList } from '../navigation/types';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Props = NativeStackScreenProps<TodayStackParamList, 'Today'>;

/**
 * Week-at-a-glance grid: habits down the rows, Monday–Sunday across.
 * Earlier weeks can be browsed with the selector; as everywhere else in
 * the app, only today can actually be toggled — past days are history.
 */
export function HabitGridScreen({ navigation }: Props) {
  const { habits, habitLogs, toggleHabitLog, logsForHabit } = useData();

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const [weekStart, setWeekStart] = useState(thisWeekStart);

  const isCurrentWeek = isSameDay(weekStart, thisWeekStart);
  const weekEnd = addDays(weekStart, 6);
  const weekDates = DAY_LETTERS.map((_, i) => addDays(weekStart, i));

  // "Aug 17 – 23" within one month, "Aug 31 – Sep 6" when it straddles two.
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
          <Pressable
            hitSlop={10}
            disabled={isCurrentWeek}
            onPress={() => setWeekStart((w) => addDays(w, 7))}
          >
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
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <View style={styles.headRow}>
              <Text style={styles.headName}>Habit</Text>
              <View style={styles.streakSlot} />
              <View style={styles.days}>
                {weekDates.map((date, i) => (
                  <View key={i} style={styles.dayCol}>
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
            </View>

            {habits.map((habit) => {
              const created = startOfDay(parseISO(habit.created_at));
              const streak = currentStreak(logsForHabit(habit.id));
              return (
                <View key={habit.id} style={styles.row}>
                  <Pressable
                    style={styles.nameWrap}
                    onPress={() => navigation.navigate('HabitDetail', { habitId: habit.id })}
                  >
                    <Text style={styles.habitName} numberOfLines={2}>
                      {habit.name}
                    </Text>
                  </Pressable>
                  {/* Fixed slot, kept even at streak 0, so names can never
                      run into the fire and every row stays aligned. */}
                  <View style={styles.streakSlot}>
                    {streak > 0 && (
                      <>
                        <Text style={styles.streakEmoji}>🔥</Text>
                        <Text style={styles.streakText}>{streak}</Text>
                      </>
                    )}
                  </View>
                  <View style={styles.days}>
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
                          hitSlop={2}
                          style={styles.dayCol}
                        >
                          <View
                            style={[
                              styles.box,
                              done ? styles.boxDone : notApplicable ? styles.boxFaded : styles.boxEmpty,
                              isToday && styles.boxToday,
                            ]}
                          >
                            {done && (
                              <MaterialCommunityIcons name="check" size={15} color={colors.accentInk} />
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
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

const BOX = 23;
const COL = 26;
const NAME_W = 114;
const STREAK_W = 32;

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
  content: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6, paddingTop: 8 },
  headName: {
    width: NAME_W,
    minWidth: NAME_W,
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  days: { flexDirection: 'row' },
  dayCol: { width: COL, minWidth: COL, alignItems: 'center' },
  dayLetter: {
    width: '100%',
    minWidth: COL,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.textFaint,
  },
  dayLetterToday: { color: colors.accent },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  nameWrap: { width: NAME_W, minWidth: NAME_W, paddingRight: 6 },
  habitName: {
    width: '100%',
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMedium,
    lineHeight: 18,
  },
  streakSlot: {
    width: STREAK_W,
    minWidth: STREAK_W,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  streakEmoji: { fontSize: 11, marginRight: 1 },
  streakText: { fontSize: 12, fontWeight: '700', color: colors.clay, minWidth: 16 },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxDone: { backgroundColor: colors.accentMedium },
  boxEmpty: { backgroundColor: colors.accentFaint },
  boxFaded: { backgroundColor: colors.accentFaint, opacity: 0.4 },
  boxToday: { borderWidth: 1.5, borderColor: colors.accentMedium },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  fab: { position: 'absolute', right: 16, bottom: 20, backgroundColor: colors.accent },
});
