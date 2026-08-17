import { format } from 'date-fns';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { useData } from '../lib/store';
import { colors } from '../theme';

type Props = { navigation: any };

export function EditWeightGoalScreen({ navigation }: Props) {
  const { weightTarget, setWeightTarget } = useData();
  const [startValue, setStartValue] = useState(weightTarget ? String(weightTarget.start_value) : '');
  const [targetValue, setTargetValue] = useState(weightTarget ? String(weightTarget.target_value) : '');
  const [targetDate, setTargetDate] = useState(
    weightTarget ? weightTarget.target_date : format(new Date(Date.now() + 90 * 86400000), 'yyyy-MM-dd')
  );

  const canSave = Boolean(parseFloat(startValue) > 0 && parseFloat(targetValue) > 0 && targetDate);

  const save = () => {
    setWeightTarget({
      start_value: parseFloat(startValue),
      target_value: parseFloat(targetValue),
      start_date: weightTarget?.start_date ?? format(new Date(), 'yyyy-MM-dd'),
      target_date: targetDate,
    });
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Starting weight (kg)</Text>
      <TextInput mode="outlined" keyboardType="decimal-pad" value={startValue} onChangeText={setStartValue} />

      <Text style={styles.label}>Target weight (kg)</Text>
      <TextInput mode="outlined" keyboardType="decimal-pad" value={targetValue} onChangeText={setTargetValue} />

      <Text style={styles.label}>Target date</Text>
      <TextInput
        mode="outlined"
        placeholder="yyyy-mm-dd"
        value={targetDate}
        onChangeText={setTargetDate}
      />
      <Text style={styles.hint}>Format: yyyy-mm-dd, e.g. {format(new Date(), 'yyyy-MM-dd')}</Text>

      <View style={styles.actions}>
        <Button mode="text" onPress={() => navigation.goBack()}>
          Cancel
        </Button>
        <Button mode="contained" onPress={save} disabled={!canSave}>
          Save goal
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 8 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  hint: { fontSize: 11, color: colors.textSecondary },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 20 },
});
