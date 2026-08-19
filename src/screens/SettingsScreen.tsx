import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Switch } from 'react-native-paper';
import { useData } from '../lib/store';
import {
  countScheduled,
  nextScheduledAlarm,
  notificationsSupported,
  requestNotificationPermission,
  scheduleTestAlarm,
} from '../lib/notifications';
import {
  batterySetupSupported,
  extraBatterySteps,
  openBatteryOptimizationPrompt,
} from '../lib/batteryOptimization';
import { isSupabaseConfigured } from '../lib/supabase';
import { colors } from '../theme';
import type { HabitView } from '../types';

const VIEW_OPTIONS: { value: HabitView; label: string; description: string }[] = [
  { value: 'cards', label: 'One card per habit', description: "Streak, this week's progress, and nudges" },
  { value: 'grid', label: 'Weekly grid', description: 'Every habit on one line, Mon–Sun across' },
];

export function SettingsScreen() {
  const {
    habits,
    seedStarterHabits,
    seedDemoData,
    habitView,
    setHabitView,
    reminders,
    remindersEnabled,
    setRemindersEnabled,
    batteryPromptShown,
    markBatteryPromptShown,
  } = useData();
  const [scheduled, setScheduled] = useState(0);
  const [nextAlarm, setNextAlarm] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Show what the OS actually has queued, not just what we intended — the two
  // diverge exactly when something has gone wrong.
  useEffect(() => {
    let active = true;
    Promise.all([countScheduled(), nextScheduledAlarm()]).then(([n, next]) => {
      if (!active) return;
      setScheduled(n);
      setNextAlarm(next);
    });
    return () => {
      active = false;
    };
  }, [reminders, remindersEnabled, refreshKey]);

  const runTestAlarm = async () => {
    const ok = await scheduleTestAlarm(60);
    setRefreshKey((k) => k + 1);
    Alert.alert(
      ok ? 'Test alarm set' : 'Could not set a test alarm',
      ok
        ? 'It should ring in about a minute. Swipe the app away from recents now — if it does not ring, your phone is killing the app and the fix is in battery settings, not the app.'
        : 'Notification permission is off. Turn on Habit alarms first.'
    );
  };

  const showTroubleshooting = () => {
    const extra = extraBatterySteps();
    // Name the steps for the phone in hand where we recognise it, rather than
    // a generic list the reader has to translate.
    const body = extra
      ? `Your ${extra.brand} phone stops background apps, which silently prevents alarms.\n\n` +
        extra.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') +
        '\n\nThen use the test alarm to check.'
      : 'Some phones stop apps that you swipe away from recents, which also stops their alarms.\n\n' +
        "1. Settings → Battery → Battery Optimization → this app → Don't optimize\n" +
        '2. Turn off any "deep" or "sleep standby" optimization\n' +
        '3. In recents, lock this app so "clear all" skips it\n\n' +
        'Then use the test alarm to check.';
    Alert.alert('Alarms not working?', body);
  };

  const toggleReminders = async (next: boolean) => {
    if (!next) {
      setRemindersEnabled(false);
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert(
        'Notifications are blocked',
        'Turn notifications on for Habit Tracker in your phone settings, then try again.'
      );
      return;
    }
    setRemindersEnabled(true);
    // Asked once, right after alarms are turned on — the point where it
    // matters and where the reason is obvious.
    if (batterySetupSupported && !batteryPromptShown) {
      markBatteryPromptShown();
      Alert.alert(
        'One more step',
        'Phones often stop background apps to save battery, which silently prevents alarms from ringing. Allowing this app to run in the background fixes it.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Allow', onPress: () => openBatteryOptimizationPrompt() },
        ]
      );
    }
  };

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
        <Text style={styles.sectionTitle}>Reminders</Text>
        <View style={[styles.card, styles.row]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Habit alarms</Text>
            <Text style={styles.rowSubtitle}>
              {notificationsSupported
                ? 'Ring at the times set on each habit'
                : 'Not available in the browser — install the app to get alarms'}
            </Text>
          </View>
          <Switch
            value={remindersEnabled}
            onValueChange={toggleReminders}
            disabled={!notificationsSupported}
            color={colors.accent}
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.rowSubtitle}>
            {reminders.length === 0
              ? 'No reminder times set yet. Open a habit and add one.'
              : notificationsSupported
                ? `${reminders.length} reminder time${reminders.length === 1 ? '' : 's'} set · ${scheduled} alarm${scheduled === 1 ? '' : 's'} queued with the phone`
                : `${reminders.length} reminder time${reminders.length === 1 ? '' : 's'} saved — these will ring once you install the app.`}
          </Text>
          {notificationsSupported && (
            <Text style={[styles.rowSubtitle, styles.nextAlarm]}>
              {nextAlarm
                ? `Next alarm: ${format(nextAlarm, 'EEE d MMM, h:mm a')}`
                : reminders.length > 0
                  ? 'Next alarm: none queued — the phone may have cleared them.'
                  : 'Next alarm: none'}
            </Text>
          )}
        </View>

        {notificationsSupported && (
          <View style={styles.card}>
            <Text style={styles.rowLabel}>Check alarms work on this phone</Text>
            <Text style={styles.rowSubtitle}>
              Rings in one minute. Swipe the app away from recents straight after — if it stays
              silent, your phone is killing the app rather than the app being broken.
            </Text>
            <Button mode="contained" onPress={runTestAlarm} style={{ marginTop: 10 }}>
              Test alarm in 1 minute
            </Button>
            <Button mode="text" onPress={showTroubleshooting} style={{ marginTop: 4 }}>
              Alarms not working?
            </Button>
          </View>
        )}

        {batterySetupSupported && (
          <View style={styles.card}>
            <Text style={styles.rowLabel}>Allow background running</Text>
            <Text style={styles.rowSubtitle}>
              Phones stop background apps to save battery, which silently prevents alarms from
              ringing. This is the setting that fixes it — Android gives no way to check it from
              here, so use the test alarm afterwards.
            </Text>
            <Button mode="outlined" onPress={openBatteryOptimizationPrompt} style={{ marginTop: 10 }}>
              Open battery setting
            </Button>
            {extraBatterySteps() && (
              <Text style={[styles.rowSubtitle, styles.brandNote]}>
                {extraBatterySteps()!.brand} phones usually need a couple of extra settings on top
                of this — see "Alarms not working?" above.
              </Text>
            )}
          </View>
        )}
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
  nextAlarm: { marginTop: 6, fontWeight: '600', color: colors.text },
  brandNote: { marginTop: 8, color: colors.warning },
});
