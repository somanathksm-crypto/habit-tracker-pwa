import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, SegmentedButtons, TextInput } from 'react-native-paper';
import { useData } from '../lib/store';
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
  const { habits, addHabit, updateHabit } = useData();
  const existing = route.params?.habitId ? habits.find((h) => h.id === route.params.habitId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<HabitCategory>(existing?.category ?? 'general');
  const [frequency, setFrequency] = useState<FrequencyType>(existing?.frequency_type ?? 'daily');
  const [target, setTarget] = useState(existing?.target_count ? String(existing.target_count) : '');

  const canSave = name.trim().length > 0;

  const save = () => {
    const target_count = target.trim() ? parseInt(target, 10) : null;
    if (existing) {
      updateHabit(existing.id, { name: name.trim(), category, frequency_type: frequency, target_count });
    } else {
      addHabit({ name: name.trim(), category, frequency_type: frequency, target_count });
    }
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
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
});
