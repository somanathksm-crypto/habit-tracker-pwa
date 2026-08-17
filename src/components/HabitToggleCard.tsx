import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { habitNudge } from '../lib/stats';
import { colors } from '../theme';
import type { Habit, HabitLog } from '../types';
import { WeekStrip } from './WeekStrip';

interface Props {
  habit: Habit;
  logs: HabitLog[];
  streak: number;
  onToggleDay: (dateStr: string) => void;
  onPress: () => void;
}

export function HabitToggleCard({ habit, logs, streak, onToggleDay, onPress }: Props) {
  const nudge = habitNudge(logs, habit.created_at);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.name}>{habit.name}</Text>
      <View style={styles.metaRow}>
        <WeekStrip logs={logs} createdAt={habit.created_at} onToggleDay={onToggleDay} />
        {streak > 0 && (
          <View style={styles.streakChip}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        )}
      </View>
      {nudge && (
        <View style={[styles.nudgeBanner, nudgeBannerStyles[nudge.tone]]}>
          <Text style={[styles.nudgeText, nudgeTextStyles[nudge.tone]]}>{nudge.text} !!!</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  name: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.claySoft,
    borderRadius: 8,
    minWidth: 23,
    height: 23,
    paddingHorizontal: 8,
    marginLeft: 10,
  },
  streakEmoji: { fontSize: 14, marginRight: 3 },
  streakText: { fontSize: 14, fontWeight: '700', color: colors.clay },
  nudgeBanner: { borderRadius: 12, padding: 10, marginTop: 10 },
  nudgeText: { fontSize: 12, fontWeight: '600' },
});

const nudgeBannerStyles = StyleSheet.create({
  warning: { backgroundColor: colors.dangerSoft },
  neutral: { backgroundColor: colors.surfaceMuted },
  info: { backgroundColor: colors.warningSoft },
});

const nudgeTextStyles = StyleSheet.create({
  warning: { color: colors.danger },
  neutral: { color: colors.textSecondary },
  info: { color: colors.warning },
});
