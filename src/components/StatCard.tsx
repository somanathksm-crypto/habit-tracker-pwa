import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { colors } from '../theme';

interface Props {
  label: string;
  value: string;
  /** For short status words (e.g. "Ahead") that read better as a badge than a large number. */
  pill?: boolean;
  style?: ViewStyle;
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  /** 0-1. Fills that fraction of the card from the bottom as a visual progress indicator. */
  fillPct?: number;
  /** Shown in an alert when the info (i) icon is tapped, explaining what this stat means. */
  infoText?: string;
  /** Small secondary line under the label, e.g. "3 missed". */
  subLabel?: string;
}

export function StatCard({ label, value, pill, style, iconName, iconColor, fillPct, infoText, subLabel }: Props) {
  return (
    <View style={[styles.card, style]}>
      {fillPct !== undefined && (
        <View style={[styles.fill, { height: `${Math.round(Math.min(1, Math.max(0, fillPct)) * 100)}%` }]} />
      )}
      {infoText && (
        <Pressable
          hitSlop={10}
          style={styles.infoButton}
          onPress={() => Alert.alert(label, infoText)}
        >
          <MaterialCommunityIcons name="information-outline" size={14} color={colors.textFaint} />
        </Pressable>
      )}
      <View style={styles.valueRow}>
        {iconName && <MaterialCommunityIcons name={iconName} size={16} color={iconColor} style={styles.icon} />}
        <Text style={pill ? styles.pillText : styles.value}>{value}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 90,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.accentSoft },
  infoButton: { position: 'absolute', top: 6, right: 6, padding: 2 },
  valueRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  icon: { marginRight: 4 },
  value: { fontSize: 19, fontWeight: '700', color: colors.text, minWidth: 55, textAlign: 'center' },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 90,
    textAlign: 'center',
  },
  label: { fontSize: 11, color: colors.textSecondary },
  subLabel: { fontSize: 10, color: colors.danger, marginTop: 2 },
});
