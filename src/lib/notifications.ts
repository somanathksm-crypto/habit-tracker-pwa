import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Habit, HabitReminder } from '../types';

export const ALARM_CHANNEL_ID = 'habit-alarms';

/** Long buzz-pause-buzz, so it reads as an alarm rather than a passing ping. */
const VIBRATION_PATTERN = [0, 700, 400, 700, 400, 700];

/**
 * Reminders are local scheduled notifications — no server involved. They only
 * exist on native; the web build keeps the same settings UI but every call
 * here is a no-op, since browsers can't schedule anything without push
 * infrastructure.
 */
export const notificationsSupported = Platform.OS !== 'web';

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

function parseTime(time: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Rebuilds the whole schedule from scratch: cancel everything, then register
 * one repeating daily alarm per reminder. Cheaper to reason about than
 * diffing, and the counts here are small.
 *
 * Returns how many alarms are now scheduled.
 */
export async function syncScheduledReminders(
  habits: Habit[],
  reminders: HabitReminder[],
  enabled: boolean
): Promise<number> {
  if (!notificationsSupported) return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return 0;

  if (!(await hasNotificationPermission())) return 0;
  await ensureAlarmChannel();

  const habitsById = new Map(habits.map((h) => [h.id, h]));
  let scheduled = 0;

  for (const reminder of reminders) {
    const habit = habitsById.get(reminder.habit_id);
    const parsed = parseTime(reminder.time);
    // A reminder can outlive its habit if data was edited oddly — skip rather than crash.
    if (!habit || !parsed) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: habit.name,
        body: `Time for ${habit.name}`,
        sound: 'default',
        vibrate: VIBRATION_PATTERN,
        priority: Notifications.AndroidNotificationPriority.MAX,
        color: '#35513F',
        // Stays in the shade until acted on, like an alarm rather than a toast.
        sticky: true,
        autoDismiss: false,
        interruptionLevel: 'timeSensitive',
        data: { habitId: habit.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: parsed.hour,
        minute: parsed.minute,
        channelId: ALARM_CHANNEL_ID,
      },
    });
    scheduled += 1;
  }

  return scheduled;
}

export async function countScheduled(): Promise<number> {
  if (!notificationsSupported) return 0;
  return (await Notifications.getAllScheduledNotificationsAsync()).length;
}
