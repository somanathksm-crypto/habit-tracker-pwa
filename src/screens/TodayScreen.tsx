import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FAB } from 'react-native-paper';
import { HabitToggleCard } from '../components/HabitToggleCard';
import { ProgressRing } from '../components/ProgressRing';
import { useData } from '../lib/store';
import { todayStr } from '../lib/stats';
import { periodStreak } from '../lib/habitSchedule';
import { colors } from '../theme';
import type { TodayStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<TodayStackParamList, 'Today'>;

export function TodayScreen({ navigation }: Props) {
  const { habits, habitLogs, toggleHabitLog, logsForHabit, remindersForHabit } = useData();
  const today = todayStr();

  const doneCount = habits.filter((h) =>
    habitLogs.some((l) => l.habit_id === h.id && l.log_date === today && l.completed)
  ).length;

  const allDone = habits.length > 0 && doneCount === habits.length;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{format(new Date(), 'EEEE, MMM d')}</Text>
            <Text style={styles.greeting}>Today</Text>
          </View>
          {habits.length > 0 && <ProgressRing completed={doneCount} total={habits.length} />}
        </View>

        {allDone && (
          <View style={styles.doneBanner}>
            <Text style={styles.doneBannerText}>Nice — everything's done for today.</Text>
          </View>
        )}

        {habits.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button below to add your first habit — anything you want to keep on top
              of, however often it's due.
            </Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {habits.map((habit) => (
              <HabitToggleCard
                key={habit.id}
                habit={habit}
                logs={logsForHabit(habit.id)}
                streak={periodStreak(habit, logsForHabit(habit.id))}
                reminders={remindersForHabit(habit.id)}
                onToggleDay={(dateStr) => toggleHabitLog(habit.id, dateStr)}
                onPress={() => navigation.navigate('HabitDetail', { habitId: habit.id })}
                onEditAlarms={() => navigation.navigate('AddEditHabit', { habitId: habit.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>

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
  content: { padding: 16, paddingBottom: 100, gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  date: { fontSize: 13, color: colors.textSecondary },
  greeting: { fontSize: 24, fontWeight: '700', color: colors.text },
  doneBanner: {
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  doneBannerText: { color: colors.accent, fontWeight: '500', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  section: { gap: 8, marginTop: 8 },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4, textTransform: 'uppercase' },
  cardList: { gap: 8 },
  fab: { position: 'absolute', right: 16, bottom: 20, backgroundColor: colors.accent },
});
