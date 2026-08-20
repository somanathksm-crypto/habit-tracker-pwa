import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

  const explainDeadlines = () =>
    Alert.alert(
      'When it counts',
      `Any time — you have until midnight. Tick them off in any order, whenever suits.
Right for something like water, where the fourth glass has no particular hour.

At particular time — each one is missed as soon as the next is due, and the last
one at midnight. An 8am dose still unticked when the 2pm one comes round counts as
missed, and the streak breaks there. Right for medication, where timing is the point.

Either way the alarms ring the same. This only changes when an unticked one is
counted against you.`
    );

  /**
   * Default times for `count` slots, spread across the waking day.
   *
   * Deliberately all different: reminders are deduplicated by time on save, so
   * seeding several rows at one default would collapse them into a single row
   * and leave slots with no time at all.
   */
  const spreadTimes = (count: number): ReminderDraft[] => {
    const START = 8 * 60;
    const END = 20 * 60;
    const step = count > 1 ? (END - START) / (count - 1) : 0;
    return Array.from({ length: count }, (_, i) => {
      const mins = Math.round((START + step * i) / 5) * 5;
      return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    }).map((time) => ({ time }));
  };

  /**
   * A particular time is meaningless without times to be particular about — a
   * slot with no reminder falls back to end of day and silently undoes the
   * choice. So both picking the mode and raising the count fill in the gap.
   */
  const topUpTimes = (count: number, mode: SlotDeadline) => {
    if (mode !== 'onTime') return;
    setReminders((rs) => (rs.length >= count ? rs : [...rs, ...spreadTimes(count).slice(rs.length)]));
  };

  const chooseDeadline = (mode: SlotDeadline) => {
    setSlotDeadline(mode);
    topUpTimes(timesPerDay, mode);
  };

  // Lowering the count keeps the extra times rather than discarding what was
  // typed; they simply stop scheduling until the count comes back up.
  const changeTimesPerDay = (next: number) => {
    setTimesPerDay(next);
    topUpTimes(next, slotDeadline);
  };
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
          onPress={() => changeTimesPerDay(Math.max(1, timesPerDay - 1))}
        >
          <Text style={styles.stepperText}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{timesPerDay}</Text>
        <Pressable
          style={styles.stepper}
          onPress={() => changeTimesPerDay(Math.min(MAX_TIMES_PER_DAY, timesPerDay + 1))}
        >
          <Text style={styles.stepperText}>+</Text>
        </Pressable>
        <Text style={styles.stepperHint}>
          {timesPerDay === 1 ? 'Once a day' : `Tick off ${timesPerDay} separately`}
        </Text>
      </View>

      {/* Only a question once there is more than one, which is almost never. */}
      {timesPerDay > 1 && (
        <View style={styles.deadlineHeader}>
          <Text style={styles.deadlineTitle}>When it counts</Text>
          <Pressable hitSlop={10} onPress={explainDeadlines}>
            <MaterialCommunityIcons name="information-outline" size={19} color={colors.alarm} />
          </Pressable>
        </View>
      )}
      {timesPerDay > 1 && (
        <View style={styles.deadlineRow}>
          {(
            [
              { value: 'endOfDay', label: 'Any time' },
              { value: 'onTime', label: 'At particular time' },
            ] as { value: SlotDeadline; label: string }[]
          ).map((opt) => {
            const active = slotDeadline === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => chooseDeadline(opt.value)}
                style={[styles.deadlineChip, active && styles.deadlineChipActive]}
              >
                <Text style={[styles.deadlineLabel, active && styles.deadlineLabelActive]}>{opt.label}</Text>
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
  deadlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  deadlineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    minWidth: 120,
  },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 8 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.surface },
  hint: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginTop: -2 },
  addTime: { marginTop: 12, alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
});
