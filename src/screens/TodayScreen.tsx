import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FAB, TextInput } from 'react-native-paper';
import { AvatarFlex } from '../components/AvatarFlex';
import { HabitToggleCard } from '../components/HabitToggleCard';
import { ProgressRing } from '../components/ProgressRing';
import { useData } from '../lib/store';
import { avatarStageInfo, currentStreak, todayStr } from '../lib/stats';
import { colors } from '../theme';
import { HABIT_CATEGORIES } from '../types';
import type { TodayStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<TodayStackParamList, 'Today'>;

export function TodayScreen({ navigation }: Props) {
  const { habits, habitLogs, weightLogs, metricLogs, toggleHabitLog, upsertWeightLog, logsForHabit } = useData();
  const [weightInput, setWeightInput] = useState('');
  const today = todayStr();

  const todaysWeight = weightLogs.find((w) => w.log_date === today);
  const doneCount = habits.filter((h) =>
    habitLogs.some((l) => l.habit_id === h.id && l.log_date === today && l.completed)
  ).length;
  const avatar = avatarStageInfo(habitLogs, metricLogs);

  const grouped = useMemo(() => {
    return HABIT_CATEGORIES.map((c) => ({
      ...c,
      habits: habits.filter((h) => h.category === c.value),
    })).filter((g) => g.habits.length > 0);
  }, [habits]);

  const allDone = habits.length > 0 && doneCount === habits.length;

  const saveWeight = () => {
    const val = parseFloat(weightInput);
    if (!Number.isNaN(val) && val > 0) {
      upsertWeightLog(today, val);
      setWeightInput('');
    }
  };

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

        <View style={styles.avatarCard}>
          <AvatarFlex stage={avatar.stage} size={72} />
          <View style={styles.avatarText}>
            <Text style={styles.avatarStageLabel}>{avatar.label}</Text>
            <Text style={styles.avatarProgress}>
              {avatar.nextThreshold
                ? `${avatar.completions}/${avatar.nextThreshold} to next stage`
                : `${avatar.completions} completions — maxed out`}
            </Text>
          </View>
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
              Tap the + button below to add your first habit — diet, skincare, supplements, or
              anything else you want to track daily.
            </Text>
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.value} style={styles.section}>
              <Text style={styles.sectionHeader}>{group.label}</Text>
              <View style={styles.cardList}>
                {group.habits.map((habit) => (
                  <HabitToggleCard
                    key={habit.id}
                    habit={habit}
                    logs={logsForHabit(habit.id)}
                    streak={currentStreak(logsForHabit(habit.id))}
                    onToggleDay={(dateStr) => toggleHabitLog(habit.id, dateStr)}
                    onPress={() => navigation.navigate('HabitDetail', { habitId: habit.id })}
                  />
                ))}
              </View>
            </View>
          ))
        )}

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Weight</Text>
          <View style={styles.weightCard}>
            {todaysWeight ? (
              <Text style={styles.weightLogged}>Logged today: {todaysWeight.value} kg</Text>
            ) : (
              <>
                <TextInput
                  mode="outlined"
                  placeholder="Log today's weight (kg)"
                  keyboardType="decimal-pad"
                  value={weightInput}
                  onChangeText={setWeightInput}
                  onSubmitEditing={saveWeight}
                  style={styles.weightInput}
                  dense
                  right={
                    weightInput ? <TextInput.Icon icon="check" onPress={saveWeight} /> : undefined
                  }
                />
              </>
            )}
          </View>
        </View>
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
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  avatarText: { flex: 1, marginLeft: 12 },
  avatarStageLabel: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  avatarProgress: { fontSize: 12, color: colors.textSecondary },
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
  weightCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  weightInput: { backgroundColor: colors.surface },
  weightLogged: { padding: 12, fontSize: 14, color: colors.text, fontWeight: '500' },
  fab: { position: 'absolute', right: 16, bottom: 20, backgroundColor: colors.accent },
});
