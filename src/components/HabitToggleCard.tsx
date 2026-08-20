import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { habitNudge } from '../lib/stats';
import { useColors, type Colors } from '../theme';
import type { Habit, HabitLog, HabitReminder } from '../types';
import { AlarmBadge } from './AlarmBadge';
import { WeekStrip } from './WeekStrip';

interface Props {
  habit: Habit;
  logs: HabitLog[];
  streak: number;
  reminders: HabitReminder[];
  onToggleDay: (dateStr: string) => void;
  onPress: () => void;
  onEditAlarms: () => void;
}

export function HabitToggleCard({
  habit,
  logs,
  streak,
  reminders,
  onToggleDay,
  onPress,
  onEditAlarms,
}: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const nudgeBannerStyles = useMemo(() => makeNudgeBannerStyles(colors), [colors]);
  const nudgeTextStyles = useMemo(() => makeNudgeTextStyles(colors), [colors]);
  const nudge = habitNudge(habit, logs);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.nameRow}>
        <AlarmBadge reminders={reminders} onPress={onEditAlarms} variant="pill" />
        <Text style={styles.name}>{habit.name}</Text>
      </View>
      <View style={styles.metaRow}>
        <WeekStrip habit={habit} logs={logs} createdAt={habit.created_at} onToggleDay={onToggleDay} />
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

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  name: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text },
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

const makeNudgeBannerStyles = (colors: Colors) =>
  StyleSheet.create({
  warning: { backgroundColor: colors.dangerSoft },
  neutral: { backgroundColor: colors.surfaceMuted },
  info: { backgroundColor: colors.warningSoft },
});

const makeNudgeTextStyles = (colors: Colors) =>
  StyleSheet.create({
  warning: { color: colors.danger },
  neutral: { color: colors.textSecondary },
  info: { color: colors.warning },
});
