import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, SegmentedButtons, TextInput } from 'react-native-paper';
import { TimeField } from '../components/TimeField';
import { useData } from '../lib/store';
import { notificationsSupported, requestNotificationPermission } from '../lib/notifications';
import { categoryColors, colors } from '../theme';
import { HABIT_CATEGORIES, type FrequencyType, type HabitCategory } from '../types';

type Props = {
  route: { params: { habitId?: string } };
  navigation: any;
};

const FREQUENCY_OPTIONS: { value: FrequencyType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
];

export function AddEditHabitScreen({ route, navigation }: Props) {
  const { habits, addHabit, updateHabit, remindersForHabit, setRemindersForHabit, setRemindersEnabled } = useData();
  const existing = route.params?.habitId ? habits.find((h) => h.id === route.params.habitId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<HabitCategory>(existing?.category ?? 'general');
  const [frequency, setFrequency] = useState<FrequencyType>(existing?.frequency_type ?? 'daily');
  const [target, setTarget] = useState(existing?.target_count ? String(existing.target_count) : '');
  // Held locally until save — a new habit has no id to attach reminders to yet.
  const [times, setTimes] = useState<string[]>(
    existing ? remindersForHabit(existing.id).map((r) => r.time) : []
  );

  const canSave = name.trim().length > 0;

  const updateTime = (index: number, time: string) =>
    setTimes((t) => t.map((v, i) => (i === index ? time : v)));
  const removeTime = (index: number) => setTimes((t) => t.filter((_, i) => i !== index));

  const addTime = async () => {
    setTimes((t) => [...t, '09:00']);
    // Ask the first time a reminder is added, rather than at app launch.
    if (notificationsSupported && times.length === 0) {
      const granted = await requestNotificationPermission();
      if (granted) setRemindersEnabled(true);
    }
  };

  const save = () => {
    const target_count = target.trim() ? parseInt(target, 10) : null;
    const habitId = existing
      ? (updateHabit(existing.id, { name: name.trim(), category, frequency_type: frequency, target_count }),
        existing.id)
      : addHabit({ name: name.trim(), category, frequency_type: frequency, target_count }).id;
    setRemindersForHabit(habitId, times);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Habit name</Text>
      <TextInput mode="outlined" placeholder="e.g. Drink water" value={name} onChangeText={setName} />

      <Text style={styles.label}>Category</Text>
      <View style={styles.chipRow}>
        {HABIT_CATEGORIES.map((c) => (
          <Chip
            key={c.value}
            selected={category === c.value}
            onPress={() => setCategory(c.value)}
            style={[styles.chip, category === c.value && { backgroundColor: `${categoryColors[c.value]}22` }]}
            selectedColor={categoryColors[c.value]}
          >
            {c.label}
          </Chip>
        ))}
      </View>

      <Text style={styles.label}>Frequency</Text>
      <SegmentedButtons value={frequency} onValueChange={(v) => setFrequency(v as FrequencyType)} buttons={FREQUENCY_OPTIONS} />

      <Text style={styles.label}>Target / goal (optional)</Text>
      <TextInput
        mode="outlined"
        placeholder="e.g. 30 days"
        keyboardType="number-pad"
        value={target}
        onChangeText={setTarget}
      />

      <Text style={styles.label}>Reminders</Text>
      <Text style={styles.hint}>
        {notificationsSupported
          ? 'Alarms for this habit. Add as many times a day as you need.'
          : 'Alarms only run in the installed app — times you set here are saved but will not ring in the browser.'}
      </Text>
      {times.map((time, i) => (
        <View key={i} style={styles.timeRow}>
          <TimeField value={time} onChange={(t) => updateTime(i, t)} />
          <Pressable onPress={() => removeTime(i)} hitSlop={10} style={styles.remove}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      ))}
      <Button mode="outlined" onPress={addTime} style={styles.addTime}>
        Add reminder time
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
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  remove: { paddingVertical: 6, paddingHorizontal: 4 },
  removeText: { fontSize: 13, fontWeight: '600', color: colors.danger, minWidth: 60 },
  addTime: { marginTop: 12, alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
});
