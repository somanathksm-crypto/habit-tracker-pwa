import { startOfMonth } from 'date-fns';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { CalendarHeatmap } from '../components/CalendarHeatmap';
import { StatCard } from '../components/StatCard';
import { useData } from '../lib/store';
import {
  longestPeriodStreak,
  missedPeriodStreak,
  periodNoun,
  periodStreak,
} from '../lib/habitSchedule';
import { monthlyWeekBreakdown } from '../lib/stats';
import { useColors, type Colors } from '../theme';

type Props = {
  route: { params: { habitId: string } };
  navigation: any;
};

export function HabitDetailScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { habitId } = route.params;
  const { habits, logsForHabit, deleteHabit } = useData();
  const habit = habits.find((h) => h.id === habitId);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));

  if (!habit) {
    return (
      <View style={styles.screen}>
        <Text style={styles.missing}>This habit was deleted.</Text>
      </View>
    );
  }

  const logs = logsForHabit(habit.id);
  const accent = colors.accent;
  const monthWeeks = monthlyWeekBreakdown([habit], logs, viewMonth);

  // A week's `goal` counts every day the habit is due, days still to come
  // included — that's what Insights needs for its "Left" column. Here the
  // question is what has actually been missed, so days that haven't happened
  // yet are excluded: tomorrow's session isn't a miss.
  const elapsedGoal = (w: (typeof monthWeeks)[number]) =>
    w.days.reduce((sum, d) => sum + (d.future ? 0 : d.goal), 0);

  const chartData = monthWeeks.map((w, i) => {
    const due = elapsedGoal(w);
    return {
      week: `Wk ${i + 1}`, // short form — w.label is the longer "Aug 1st week" used in Insights
      rate: due > 0 ? Math.round((w.completed / due) * 100) : 0,
    };
  });

  const monthCompleted = monthWeeks.reduce((sum, w) => sum + w.completed, 0);
  const monthDue = monthWeeks.reduce((sum, w) => sum + elapsedGoal(w), 0);
  const monthCompletionPct = monthDue > 0 ? monthCompleted / monthDue : 0;
  const monthMissed = monthDue - monthCompleted;
  const missedStreak = missedPeriodStreak(habit, logs);
  // "day"/"week"/"date" — the stat labels have to name the habit's own period,
  // since a Mon/Thu habit's streak counts weeks, not days.
  const noun = periodNoun(habit);
  const nounPlural = `${noun}s`;

  const confirmDelete = () => {
    Alert.alert('Delete habit?', `"${habit.name}" and all its history will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteHabit(habit.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.name}>{habit.name}</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <IconButton icon="pencil-outline" onPress={() => navigation.navigate('AddEditHabit', { habitId: habit.id })} />
          <IconButton icon="trash-can-outline" iconColor={colors.danger} onPress={confirmDelete} />
        </View>
      </View>

      {habit.notes?.trim() ? (
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>{habit.notes.trim()}</Text>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <StatCard
          label="Longest streak"
          value={`${longestPeriodStreak(habit, logs)}`}
          iconName="fire"
          iconColor={colors.longestStreak}
          infoText={`The longest run of consecutive ${nounPlural} you've ever completed this habit, across its whole history.`}
          style={{ marginRight: 10 }}
        />
        <StatCard
          label="Current streak"
          value={`${periodStreak(habit, logs)}`}
          iconName="fire"
          iconColor={colors.danger}
          infoText={`How many ${nounPlural} in a row you've completed this habit, counting back from now. The ${noun} in progress never breaks it.`}
          style={{ marginRight: 10 }}
        />
        <StatCard
          label="Completion"
          value={`${Math.round(monthCompletionPct * 100)}%`}
          fillPct={monthCompletionPct}
          infoText="Times you completed this habit divided by the times it was due, in the month you're viewing above."
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label="Missed"
          value={`${monthMissed}`}
          infoText={`Times this habit was due in the month you're viewing but wasn't done.`}
          style={{ flex: 2, marginRight: 10 }}
        />
        <StatCard
          label="Losing streak"
          value={`${missedStreak}`}
          iconName="emoticon-sad-outline"
          iconColor={colors.danger}
          infoText={`Finished ${nounPlural} in a row you've missed, ending with the most recent one. Zero once the current ${noun} is done — a ${noun} still in progress isn't counted as missed.`}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>History</Text>
        <View style={styles.card}>
          <CalendarHeatmap logs={logs} accent={accent} viewMonth={viewMonth} onChangeMonth={setViewMonth} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly completion rate</Text>
        <View style={styles.card}>
          {chartData.length === 0 ? (
            <Text style={styles.emptyChart}>No logs yet</Text>
          ) : (
            <View style={styles.barChartWithAxis}>
              <View style={styles.yAxis}>
                <Text style={styles.axisLabel}>100%</Text>
                <Text style={styles.axisLabel}>50%</Text>
                <Text style={styles.axisLabel}>0%</Text>
              </View>
              <View style={styles.barChartArea}>
                {chartData.map((w) => (
                  <View key={w.week} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: `${w.rate}%`, backgroundColor: accent }]}>
                        <Text style={styles.barValueLabel}>{w.rate}%</Text>
                      </View>
                    </View>
                    <Text style={styles.barWeekLabel}>{w.week}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  noteCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  noteText: { fontSize: 13, color: colors.textMedium, lineHeight: 19 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  missing: { padding: 24, color: colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  statsRow: { flexDirection: 'row' },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4, textTransform: 'uppercase' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  emptyChart: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 40 },
  barChartWithAxis: { flexDirection: 'row', height: 150 },
  yAxis: { width: 34, justifyContent: 'space-between', paddingVertical: 2 },
  axisLabel: { fontSize: 10, fontWeight: '600', color: colors.textFaint },
  barChartArea: { flex: 1, flexDirection: 'row' },
  barCol: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6, alignItems: 'center', paddingTop: 4, minHeight: 20 },
  barValueLabel: { fontSize: 10.5, fontWeight: '700', color: colors.accentInk, minWidth: 32, textAlign: 'center' },
  barWeekLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textFaint,
    marginTop: 6,
    minWidth: 55,
    textAlign: 'center',
  },
});
