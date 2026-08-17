import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { categoryColors, colors } from '../theme';
import type { HabitCategory } from '../types';

const LABELS: Record<HabitCategory, string> = {
  diet: 'Diet',
  skincare: 'Skincare',
  supplement: 'Supplements',
  general: 'General',
};

export function CategoryChip({ category }: { category: HabitCategory }) {
  const color = categoryColors[category];
  return (
    <Text style={styles.label}>
      <Text style={{ color }}>{'● '}</Text>
      {LABELS[category]}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11.5, fontWeight: '600', color: colors.textSecondary },
});
