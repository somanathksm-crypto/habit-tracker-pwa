import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, SegmentedButtons, TextInput } from 'react-native-paper';
import { useData } from '../lib/store';
import { colors } from '../theme';

type Props = {
  route: { params: { metricId?: string } };
  navigation: any;
};

const DIRECTION_OPTIONS: { value: 'higher' | 'lower'; label: string }[] = [
  { value: 'higher', label: 'Higher is better' },
  { value: 'lower', label: 'Lower is better' },
];

export function AddEditMetricScreen({ route, navigation }: Props) {
  const { metrics, addMetric, updateMetric } = useData();
  const existing = route.params?.metricId ? metrics.find((m) => m.id === route.params.metricId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [unit, setUnit] = useState(existing?.unit ?? '');
  const [direction, setDirection] = useState<'higher' | 'lower'>(
    (existing?.higher_is_better ?? true) ? 'higher' : 'lower'
  );

  const canSave = name.trim().length > 0 && unit.trim().length > 0;

  const save = () => {
    const higher_is_better = direction === 'higher';
    if (existing) {
      updateMetric(existing.id, { name: name.trim(), unit: unit.trim(), higher_is_better });
    } else {
      addMetric({ name: name.trim(), unit: unit.trim(), higher_is_better });
    }
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Metric name</Text>
      <TextInput mode="outlined" placeholder="e.g. Pushup count" value={name} onChangeText={setName} />

      <Text style={styles.label}>Unit</Text>
      <TextInput mode="outlined" placeholder="e.g. reps, min, kg" value={unit} onChangeText={setUnit} />

      <Text style={styles.label}>Direction</Text>
      <SegmentedButtons value={direction} onValueChange={(v) => setDirection(v as 'higher' | 'lower')} buttons={DIRECTION_OPTIONS} />

      <View style={styles.actions}>
        <Button mode="text" onPress={() => navigation.goBack()}>
          Cancel
        </Button>
        <Button mode="contained" onPress={save} disabled={!canSave}>
          {existing ? 'Save changes' : 'Add metric'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 8 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
});
