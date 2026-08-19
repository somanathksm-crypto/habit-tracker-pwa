import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Switch } from 'react-native-paper';
import { useData } from '../lib/store';
import { isSupabaseConfigured } from '../lib/supabase';
import { colors } from '../theme';
import type { HabitView } from '../types';

const VIEW_OPTIONS: { value: HabitView; label: string; description: string }[] = [
  { value: 'cards', label: 'One card per habit', description: "Streak, this week's progress, and nudges" },
  { value: 'grid', label: 'Weekly grid', description: 'Every habit on one line, Mon–Sun across' },
];

export function SettingsScreen() {
  const [reminder, setReminder] = useState(false);
  const { habits, seedStarterHabits, seedDemoData, habitView, setHabitView } = useData();

  const loadStarterHabits = () => {
    const added = seedStarterHabits();
    Alert.alert(
      added > 0 ? 'Habits added' : 'Already up to date',
      added > 0 ? `Added ${added} habit${added === 1 ? '' : 's'} from your 2026 spreadsheet.` : 'All of those habits are already in your list.'
    );
  };

  const fillWithSampleData = () => {
    if (habits.length === 0) {
      Alert.alert('Add habits first', 'Load your starter habits (or add one manually) before generating sample history.');
      return;
    }
    seedDemoData();
    Alert.alert('Sample data added', 'Random history for each habit and a sample weight trend have been generated so you can preview the app populated.');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.rowLabel}>
            {isSupabaseConfigured ? 'Connected to Supabase' : 'Not connected — running on local device storage'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Habit layout</Text>
        {VIEW_OPTIONS.map((opt) => {
          const active = habitView === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setHabitView(opt.value)}
              style={[styles.card, styles.row, active && styles.cardActive]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{opt.label}</Text>
                <Text style={styles.rowSubtitle}>{opt.description}</Text>
              </View>
              <Text style={[styles.check, !active && styles.checkHidden]}>✓</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={[styles.card, styles.row]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Daily reminder</Text>
            <Text style={styles.rowSubtitle}>Nudge to log habits each evening</Text>
          </View>
          <Switch value={reminder} onValueChange={setReminder} color={colors.accent} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.card}>
          <Text style={styles.rowLabel}>Load 2026 habit list</Text>
          <Text style={styles.rowSubtitle}>Adds the diet, supplement, skincare, and wellness habits from your 2026 spreadsheet (skips any you've already added).</Text>
          <Button mode="contained" onPress={loadStarterHabits} style={{ marginTop: 10 }}>
            Load starter habits
          </Button>
        </View>
        <View style={styles.card}>
          <Text style={styles.rowLabel}>Preview with sample data</Text>
          <Text style={styles.rowSubtitle}>Fills your current habits with random history and a sample weight trend, purely so you can see the app populated. Not real data — running this again replaces it.</Text>
          <Button mode="outlined" onPress={fillWithSampleData} style={{ marginTop: 10 }}>
            Fill with sample data
          </Button>
        </View>
        <View style={styles.card}>
          <Text style={styles.rowSubtitle}>Export coming later.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 20 },
  header: { fontSize: 24, fontWeight: '700', color: colors.text },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4, textTransform: 'uppercase' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardActive: { borderColor: colors.accentMedium, backgroundColor: colors.accentFaint },
  check: { fontSize: 17, fontWeight: '700', color: colors.accent, minWidth: 24, textAlign: 'right' },
  checkHidden: { opacity: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  rowSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
