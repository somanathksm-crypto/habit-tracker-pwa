import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ensureNotificationCategory } from './notificationActions';
import {
  ALARM_CATEGORY_ID,
  ALARM_CHANNEL_ID,
  VIBRATION_PATTERN,
  notificationsSupported,
} from './notificationConstants';
import { MAX_SCHEDULED_ANDROID, MAX_SCHEDULED_IOS, plannedOccurrences } from './reminderSchedule';
import type { Habit, HabitLog, HabitReminder } from '../types';

export { ALARM_CHANNEL_ID, notificationsSupported };

/** Foreground behaviour: an alarm should still be seen and heard if the app is open. */
export function configureNotificationHandler() {
  if (!notificationsSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  // Register the action buttons at startup rather than only during a sync —
  // a notification delivered before any sync has run would otherwise reference
  // a category the system doesn't know about yet, and show no buttons.
  ensureNotificationCategory().catch(() => {});
  ensureAlarmChannel().catch(() => {});
}

/**
 * Android routes sound through a channel, not the notification, so alarm
 * behaviour (alarm audio stream, max importance, DND bypass) has to be set
 * here. Changing these values later requires reinstalling the app — Android
 * ignores edits to an existing channel.
 */
export async function ensureAlarmChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
    name: 'Habit alarms',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: VIBRATION_PATTERN,
    enableVibrate: true,
    enableLights: true,
    lightColor: '#35513F',
    bypassDnd: true,
    showBadge: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      flags: { enforceAudibility: true, requestHardwareAudioVideoSynchronization: false },
    },
  });
}

/** Returns true if we're allowed to post notifications. Safe to call repeatedly. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false, allowCriticalAlerts: true },
  });
  return asked.granted;
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  return (await Notifications.getPermissionsAsync()).granted;
}

/**
 * Rebuilds the whole schedule from scratch: cancel everything, then register
 * each upcoming alarm as its own dated trigger.
 *
 * Deliberately *not* using the OS's repeating triggers. A repeating trigger
 * can't skip a single day, and skipping days the habit is already done is a
 * requirement — so firing times are computed here (see `plannedOccurrences`)
 * and registered individually. The trade-off is a finite queue: it holds the
 * soonest [MAX_SCHEDULED] alarms and is refilled on every change and app
 * launch, so the app has to be opened occasionally to stay topped up.
 *
 * Returns how many alarms are now scheduled.
 */
/** Stable per-alarm id, so the same firing always maps to the same OS entry. */
function alarmId(reminderId: string, date: Date): string {
  return `alarm:${reminderId}:${date.getTime()}`;
}

/** Only alarms we own, so a snoozed or test notification is never touched. */
function isOurAlarmId(id: string): boolean {
  return id.startsWith('alarm:');
}

/**
 * Serialises syncs. Two runs overlapping used to be able to undo each other's
 * work — one cancelling what the other had just scheduled — leaving an
 * unpredictable number of alarms registered.
 */
let syncChain: Promise<number> = Promise.resolve(0);

export function syncScheduledReminders(
  habits: Habit[],
  reminders: HabitReminder[],
  habitLogs: HabitLog[],
  enabled: boolean
): Promise<number> {
  syncChain = syncChain
    .catch(() => 0)
    .then(() => runSync(habits, reminders, habitLogs, enabled));
  return syncChain;
}

async function runSync(
  habits: Habit[],
  reminders: HabitReminder[],
  habitLogs: HabitLog[],
  enabled: boolean
): Promise<number> {
  if (!notificationsSupported) return 0;

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const ours = existing.filter((r) => isOurAlarmId(r.identifier));

  if (!enabled || !(await hasNotificationPermission())) {
    for (const request of ours) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
    return 0;
  }

  await ensureAlarmChannel();
  await ensureNotificationCategory();

  const habitsById = new Map(habits.map((h) => [h.id, h]));
  const cap = Platform.OS === 'ios' ? MAX_SCHEDULED_IOS : MAX_SCHEDULED_ANDROID;
  const planned = plannedOccurrences(habits, reminders, habitLogs, new Date(), cap);

  const wanted = new Map(planned.map((o) => [alarmId(o.reminder.id, o.date), o]));
  const have = new Set(ours.map((r) => r.identifier));

  // Deliberately a diff rather than cancel-everything-then-rebuild. Wiping the
  // lot first leaves a window where the app owns no alarms at all, and if it is
  // closed mid-rebuild (or the phone kills it) they simply stay gone.
  for (const request of ours) {
    if (!wanted.has(request.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  }

  for (const [id, { reminder, date }] of wanted) {
    if (have.has(id)) continue;
    const habit = habitsById.get(reminder.habit_id);
    if (!habit) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: habit.name,
        body: `Time for ${habit.name}`,
        sound: 'default',
        vibrate: VIBRATION_PATTERN,
        priority: Notifications.AndroidNotificationPriority.MAX,
        color: '#35513F',
        // Deliberately not `sticky` — an ongoing notification can't be swiped
        // away, which left no way to dismiss an alarm short of opening the app.
        interruptionLevel: 'timeSensitive',
        categoryIdentifier: ALARM_CATEGORY_ID,
        // habitName rides along so a snooze fired from the background context
        // can rebuild the alarm without reading stored state.
        data: { habitId: habit.id, habitName: habit.name, reminderId: reminder.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: ALARM_CHANNEL_ID,
      },
    });
  }

  return wanted.size;
}

export async function countScheduled(): Promise<number> {
  if (!notificationsSupported) return 0;
  return (await Notifications.getAllScheduledNotificationsAsync()).length;
}

/**
 * Earliest alarm the OS actually holds — read back from the system rather than
 * recomputed from our own state, so it tells you what will really happen. If
 * the app has been force-stopped (some Android skins do this when you swipe it
 * off recents) the OS drops the alarms and this reports null even though the
 * reminders are still configured.
 */
export async function nextScheduledAlarm(): Promise<Date | null> {
  if (!notificationsSupported) return null;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  let soonest: number | null = null;
  for (const request of scheduled) {
    // What comes back is the *serialised* trigger, not the input we passed.
    // Android sends a date trigger as { type: 'date', value: timestamp } — the
    // `date` key only exists on the input side, so reading that alone finds
    // nothing and makes a healthy queue look empty.
    const trigger = request.trigger as
      | { type?: string; value?: number | string; date?: number | string | Date }
      | null;
    if (!trigger) continue;
    const raw = trigger.value ?? trigger.date;
    if (raw === undefined) continue;
    const ms = raw instanceof Date ? raw.getTime() : new Date(raw).getTime();
    if (Number.isNaN(ms)) continue;
    if (soonest === null || ms < soonest) soonest = ms;
  }
  return soonest === null ? null : new Date(soonest);
}

export interface TestAlarmResult {
  ok: boolean;
  reason?: 'unsupported' | 'permission' | 'not-queued';
  /** Read back from the OS, so it reflects what will really happen. */
  firesAt?: Date;
  queued?: number;
}

/**
 * Fires a one-off alarm shortly, to check alarms survive on this device.
 * Reads the queue back afterwards: "it didn't ring" is ambiguous between never
 * being scheduled and being scheduled then killed, and those need different
 * fixes.
 */
export async function scheduleTestAlarm(seconds = 60): Promise<TestAlarmResult> {
  if (!notificationsSupported) return { ok: false, reason: 'unsupported' };
  if (!(await requestNotificationPermission())) return { ok: false, reason: 'permission' };
  await ensureAlarmChannel();
  await ensureNotificationCategory();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test alarm',
      body: 'Alarms are working on this phone.',
      sound: 'default',
      vibrate: VIBRATION_PATTERN,
      priority: Notifications.AndroidNotificationPriority.MAX,
      color: '#35513F',
      interruptionLevel: 'timeSensitive',
      // Carries the button too, so this genuinely tests what a real alarm does.
      categoryIdentifier: ALARM_CATEGORY_ID,
      data: { test: true, habitName: 'Test alarm' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: ALARM_CHANNEL_ID,
    },
  });

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const test = scheduled.find((r) => (r.content?.data as { test?: boolean })?.test === true);
  if (!test) return { ok: false, reason: 'not-queued', queued: scheduled.length };

  return {
    ok: true,
    firesAt: new Date(Date.now() + seconds * 1000),
    queued: scheduled.length,
  };
}
