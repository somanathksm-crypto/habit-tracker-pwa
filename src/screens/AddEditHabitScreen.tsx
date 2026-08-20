import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { ReminderRow } from '../components/ReminderRow';
import { ScheduleField } from '../components/ScheduleField';
import { useData } from '../lib/store';
import { notificationsSupported, requestNotificationPermission } from '../lib/notifications';
import { useColors, type Colors } from '../theme';
import {
  DEFAULT_SCHEDULE,
  MAX_TIMES_PER_DAY,
  type HabitReminder,
  type HabitSchedule,
  type SlotDeadline,
} from '../types';

type ReminderDraft = Omit<HabitReminder, 'id' | 'habit_id'>;

type Props = {
  route: { params: { habitId?: string } };
  navigation: any;
};

export function AddEditHabitScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { habits, addHabit, updateHabit, remindersForHabit, setRemindersForHabit, setRemindersEnabled } = useData();
  const existing = route.params?.habitId ? habits.find((h) => h.id === route.params.habitId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [timesPerDay, setTimesPerDay] = useState(existing?.timesPerDay ?? 1);
  const [slotDeadline, setSlotDeadline] = useState<SlotDeadline>(existing?.slotDeadline ?? 'endOfDay');
  const [schedule, setSchedule] = useState<HabitSchedule>(existing?.schedule ?? { ...DEFAULT_SCHEDULE });
  // Held locally until save — a new habit has no id to attach reminders to yet.
  const [reminders, setReminders] = useState<ReminderDraft[]>(
    existing
      ? remindersForHabit(existing.id).map((r) => ({ time: r.time }))
      : []
  );

  const canSave = name.trim().length > 0;

  const updateReminder = (index: number, next: ReminderDraft) =>
    setReminders((rs) => rs.map((r, i) => (i === index ? next : r)));
  const removeReminder = (index: number) =>
    setReminders((rs) => rs.filter((_, i) => i !== index));

  const addReminder = async () => {
    setReminders((rs) => [...rs, { time: '09:00' }]);
    // Ask the first time a reminder is added, rather than at app launch.
    if (notificationsSupported && reminders.length === 0) {
      const granted = await requestNotificationPermission();
      if (granted) setRemindersEnabled(true);
    }
  };

  const save = () => {
    const habitId = existing
      ? (updateHabit(existing.id, {
          name: name.trim(),
          schedule,
          timesPerDay,
          slotDeadline,
          notes: notes.trim(),
        }),
        existing.id)
      : addHabit({ name: name.trim(), schedule, timesPerDay, slotDeadline, notes: notes.trim() }).id;
    setRemindersForHabit(habitId, reminders);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Habit name</Text>
      <TextInput mode="outlined" placeholder="e.g. Drink water" value={name} onChangeText={setName} />

      <Text style={styles.label}>How often</Text>
      <ScheduleField value={schedule} onChange={setSchedule} />

      <Text style={styles.label}>Times a day</Text>
      <View style={styles.stepperRow}>
        <Pressable
          style={styles.stepper}
          onPress={() => setTimesPerDay((n) => Math.max(1, n - 1))}
        >
          <Text style={styles.stepperText}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{timesPerDay}</Text>
        <Pressable
          style={styles.stepper}
          onPress={() => setTimesPerDay((n) => Math.min(MAX_TIMES_PER_DAY, n + 1))}
        >
          <Text style={styles.stepperText}>+</Text>
        </Pressable>
        <Text style={styles.stepperHint}>
          {timesPerDay === 1 ? 'Once a day' : `Tick off ${timesPerDay} separately`}
        </Text>
      </View>

      {/* Only a question once there is more than one, which is almost never. */}
      {timesPerDay > 1 && (
        <View style={styles.deadlineRow}>
          {(
            [
              { value: 'endOfDay', label: 'Any time', hint: 'Counts until midnight' },
              { value: 'onTime', label: 'On time', hint: 'Missed once the next is due' },
            ] as { value: SlotDeadline; label: string; hint: string }[]
          ).map((opt) => {
            const active = slotDeadline === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setSlotDeadline(opt.value)}
                style={[styles.deadlineChip, active && styles.deadlineChipActive]}
              >
                <Text style={[styles.deadlineLabel, active && styles.deadlineLabelActive]}>{opt.label}</Text>
                <Text style={styles.deadlineHint}>{opt.hint}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.label}>Notes</Text>
      <Text style={styles.hint}>Shown on the habit, and used as the alarm's message.</Text>
      <TextInput
        mode="outlined"
        placeholder="e.g. use the blue bottle"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

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

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  stepper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.accentFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { fontSize: 20, fontWeight: '700', color: colors.accent, minWidth: 18, textAlign: 'center' },
  stepperValue: { fontSize: 18, fontWeight: '800', color: colors.text, minWidth: 34, textAlign: 'center' },
  stepperHint: { fontSize: 12, color: colors.textSecondary, flex: 1, minWidth: 90 },
  deadlineRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  deadlineChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  deadlineChipActive: { borderColor: colors.accentMedium, backgroundColor: colors.accentFaint },
  deadlineLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, minWidth: 70 },
  deadlineLabelActive: { color: colors.accent },
  deadlineHint: { fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 15 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 8 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.surface },
  hint: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginTop: -2 },
  addTime: { marginTop: 12, alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
});
