import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { ReminderRow } from '../components/ReminderRow';
import { ScheduleField } from '../components/ScheduleField';
import { useData } from '../lib/store';
import { notificationsSupported, requestNotificationPermission } from '../lib/notifications';
import { colors } from '../theme';
import { DEFAULT_SCHEDULE, type HabitReminder, type HabitSchedule } from '../types';

type ReminderDraft = Omit<HabitReminder, 'id' | 'habit_id'>;

type Props = {
  route: { params: { habitId?: string } };
  navigation: any;
};

export function AddEditHabitScreen({ route, navigation }: Props) {
  const { habits, addHabit, updateHabit, remindersForHabit, setRemindersForHabit, setRemindersEnabled } = useData();
  const existing = route.params?.habitId ? habits.find((h) => h.id === route.params.habitId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [schedule, setSchedule] = useState<HabitSchedule>(existing?.schedule ?? { ...DEFAULT_SCHEDULE });
  // Held locally until save — a new habit has no id to attach reminders to yet.
  const [reminders, setReminders] = useState<ReminderDraft[]>(
    existing
      ? remindersForHabit(existing.id).map((r) => ({ time: r.time, repeat: r.repeat }))
      : []
  );

  const canSave = name.trim().length > 0;

  const updateReminder = (index: number, next: ReminderDraft) =>
    setReminders((rs) => rs.map((r, i) => (i === index ? next : r)));
  const removeReminder = (index: number) =>
    setReminders((rs) => rs.filter((_, i) => i !== index));

  const addReminder = async () => {
    setReminders((rs) => [...rs, { time: '09:00', repeat: { kind: 'daily' } }]);
    // Ask the first time a reminder is added, rather than at app launch.
    if (notificationsSupported && reminders.length === 0) {
      const granted = await requestNotificationPermission();
      if (granted) setRemindersEnabled(true);
    }
  };

  const save = () => {
    const habitId = existing
      ? (updateHabit(existing.id, { name: name.trim(), schedule }), existing.id)
      : addHabit({ name: name.trim(), schedule }).id;
    setRemindersForHabit(habitId, reminders);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Habit name</Text>
      <TextInput mode="outlined" placeholder="e.g. Drink water" value={name} onChangeText={setName} />

      <Text style={styles.label}>How often</Text>
      <ScheduleField value={schedule} onChange={setSchedule} />

      <Text style={styles.label}>Reminders</Text>
      <Text style={styles.hint}>
        {notificationsSupported
          ? 'Alarms for this habit. Add as many times a day as you need.'
          : 'Alarms only run in the installed app — times you set here are saved but will not ring in the browser.'}
      </Text>
      {reminders.map((reminder, i) => (
        <ReminderRow
          key={i}
          reminder={reminder}
          onChange={(next) => updateReminder(i, next)}
          onRemove={() => removeReminder(i)}
        />
      ))}
      <Button mode="outlined" onPress={addReminder} style={styles.addTime}>
        Add reminder
      </Button>

      <View style={styles.actions}>
        <Button mode="text" onPress={() => navigation.goBack()}>
          Cancel
        </Button>
        <Button mode="contained" onPress={save} disabled={!canSave}>
          {existing ? 'Save changes' : 'Add habit'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 8 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.surface },
  hint: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginTop: -2 },
  addTime: { marginTop: 12, alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
});
