import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useData } from '../lib/store';
import { colors } from '../theme';
import type { HabitView } from '../types';

/**
 * First-launch layout picker. Both habit views are fully functional — this
 * just decides which one the main tab opens with. Changeable in Settings.
 */
export function ChooseViewScreen() {
  const { setHabitView } = useData();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>How do you want to see your habits?</Text>
      <Text style={styles.subtitle}>
        Pick whichever feels easier to use day to day. You can switch any time in Settings.
      </Text>

      <Option
        label="One card per habit"
        description="A card for each habit with its streak, this week's progress, and a nudge when you slip."
        onPress={() => setHabitView('cards')}
        preview={<CardsPreview />}
      />

      <Option
        label="Weekly grid"
        description="Every habit on one line, Monday to Sunday across — the whole week at a glance."
        onPress={() => setHabitView('grid')}
        preview={<GridPreview />}
      />
    </ScrollView>
  );
}

function Option({
  label,
  description,
  preview,
  onPress,
}: {
  label: string;
  description: string;
  preview: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.option} onPress={onPress}>
      <View style={styles.previewBox}>{preview}</View>
      <Text style={styles.optionLabel}>{label}</Text>
      <Text style={styles.optionDescription}>{description}</Text>
      <Text style={styles.choose}>Use this layout</Text>
    </Pressable>
  );
}

function CardsPreview() {
  return (
    <View style={{ gap: 6 }}>
      {[0, 1].map((i) => (
        <View key={i} style={styles.pvCard}>
          <View style={styles.pvTitleBar} />
          <View style={styles.pvRow}>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <View key={d} style={[styles.pvBox, d < 3 && styles.pvBoxDone]} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function GridPreview() {
  return (
    <View style={styles.pvCard}>
      {[0, 1, 2, 3].map((r) => (
        <View key={r} style={styles.pvGridRow}>
          <View style={styles.pvNameBar} />
          <View style={styles.pvRow}>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <View key={d} style={[styles.pvBox, d <= r && styles.pvBoxDone]} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40, gap: 14 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, lineHeight: 30 },
  subtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 6 },
  option: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  previewBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  optionLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  optionDescription: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginTop: 3 },
  choose: { fontSize: 13, fontWeight: '700', color: colors.accent, marginTop: 10, minWidth: 120 },
  // preview primitives
  pvCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    gap: 6,
  },
  pvGridRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pvTitleBar: { width: 70, height: 7, borderRadius: 4, backgroundColor: colors.surfaceMuted },
  pvNameBar: { width: 46, height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted },
  pvRow: { flexDirection: 'row', gap: 4 },
  pvBox: { width: 12, height: 12, borderRadius: 3, backgroundColor: colors.accentFaint },
  pvBoxDone: { backgroundColor: colors.accentMedium },
});
