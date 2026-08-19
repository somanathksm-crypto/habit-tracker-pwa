import { startOfMonth } from 'date-fns';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { CalendarHeatmap } from '../components/CalendarHeatmap';
import { StatCard } from '../components/StatCard';
import { useData } from '../lib/store';
import { currentMissedStreak, currentStreak, longestStreak, monthlyWeekBreakdown } from '../lib/stats';
import { colors } from '../theme';

type Props = {
  route: { params: { habitId: string } };
  navigation: any;
};

export function HabitDetailScreen({ route, navigation }: Props) {
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
  const monthWeeks = monthlyWeekBreakdown(1, logs, viewMonth);

  const chartData = monthWeeks.map((w, i) => ({
    week: `Wk ${i + 1}`, // short form — w.label is now the longer "Aug 1st week" used in Insights
    rate: w.goal > 0 ? Math.round((w.completed / w.goal) * 100) : 0,
  }));

  const monthCompleted = monthWeeks.reduce((sum, w) => sum + w.completed, 0);
  const monthGoal = monthWeeks.reduce((sum, w) => sum + w.goal, 0);
  const monthCompletionPct = monthGoal > 0 ? monthCompleted / monthGoal : 0;
  const monthMissed = monthGoal - monthCompleted;
  const missedStreak = currentMissedStreak(logs, habit.created_at);

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

      <View style={styles.statsRow}>
        <StatCard
          label="Longest streak"
          value={`${longestStreak(logs)}`}
          iconName="fire"
          iconColor={colors.longestStreak}
          infoText="The longest run of consecutive days you've ever completed this habit, across its whole history."
          style={{ marginRight: 10 }}
        />
        <StatCard
          label="Current streak"
          value={`${currentStreak(logs)}`}
          iconName="fire"
          iconColor={colors.danger}
          infoText="How many days in a row you've completed this habit, counting back from today."
          style={{ marginRight: 10 }}
        />
        <StatCard
          label="Completion"
          value={`${Math.round(monthCompletionPct * 100)}%`}
          fillPct={monthCompletionPct}
          infoText="Days you completed this habit divided by days elapsed in the month you're viewing above."
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label="Missed days"
          value={`${monthMissed}`}
          infoText="Days you have missed in this month."
          style={{ flex: 2, marginRight: 10 }}
        />
        <StatCard
          label="Losing streak"
          value={`${missedStreak}`}
          iconName="emoticon-sad-outline"
          iconColor={colors.danger}
          infoText="How many days in a row you've missed this habit, counting back from today. Zero means today is already done."
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

const styles = StyleSheet.create({
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
