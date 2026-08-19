import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { ALARM_CATEGORY_ID, ALARM_CHANNEL_ID, notificationsSupported } from './notificationConstants';

export const ACTION_DONE = 'habit-done';
export const ACTION_SNOOZE = 'habit-snooze';
export const SNOOZE_MINUTES = 10;

/**
 * Actions pressed while the app is backgrounded or terminated run in a bare JS
 * context with no React state — so they can't just call into the store. They
 * append here instead, and the app drains this on launch and on resume.
 *
 * Deliberately a *separate* key from the main state: the background context and
 * a running app would otherwise race to write the same blob and lose data.
 */
const QUEUE_KEY = 'habit-tracker/pending-actions';

export interface PendingAction {
  type: 'complete';
  habitId: string;
  /** yyyy-MM-dd, resolved when the button was pressed, not when it's drained. */
  date: string;
  at: number;
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Registers the two buttons shown on an alarm. */
export async function ensureNotificationCategory() {
  if (!notificationsSupported) return;
  await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY_ID, [
    {
      identifier: ACTION_DONE,
      buttonTitle: 'Done',
      // Handled in the background — the point is not having to open the app.
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_SNOOZE,
      buttonTitle: `Snooze ${SNOOZE_MINUTES}m`,
      options: { opensAppToForeground: false },
    },
  ]);
}

async function enqueue(action: PendingAction) {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: PendingAction[] = raw ? JSON.parse(raw) : [];
    queue.push(action);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Losing a queued tick is survivable; crashing a background task is not.
  }
}

const LAST_HANDLED_KEY = 'habit-tracker/last-handled-response';

/**
 * Backstop for a button press the background task never got to handle — the
 * OS still remembers the most recent response, so it can be picked up next
 * time the app runs. Guarded by the notification's id so the same press isn't
 * replayed on every launch.
 */
export async function processLaunchResponse(): Promise<boolean> {
  if (!notificationsSupported) return false;
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return false;
    const id = response.notification?.request?.identifier;
    if (!id) return false;

    const handled = await AsyncStorage.getItem(LAST_HANDLED_KEY);
    if (handled === id) return false;
    await AsyncStorage.setItem(LAST_HANDLED_KEY, id);

    // Tapping the notification body isn't an action we act on.
    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) return false;

    await handleNotificationAction(
      response.actionIdentifier,
      (response.notification?.request?.content?.data ?? {}) as Record<string, unknown>,
      id
    );
    return true;
  } catch {
    return false;
  }
}

/** Reads and clears the queue. Returns what was waiting. */
export async function drainActionQueue(): Promise<PendingAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    await AsyncStorage.removeItem(QUEUE_KEY);
    return JSON.parse(raw) as PendingAction[];
  } catch {
    return [];
  }
}

/**
 * Handles presses that arrive while the app is open. The background task only
 * covers backgrounded/terminated, so without this a press with the app in view
 * would do nothing. `onHandled` lets the store drain the queue immediately
 * rather than waiting for the next foreground event.
 */
export function addForegroundActionListener(onHandled: () => void) {
  if (!notificationsSupported) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationAction(
      response.actionIdentifier,
      (response.notification?.request?.content?.data ?? {}) as Record<string, unknown>,
      response.notification?.request?.identifier
    )
      .then(onHandled)
      .catch(() => {});
  });
  return () => sub.remove();
}

/**
 * Shared handling for a pressed action button, whichever context delivers it —
 * the foreground listener, the Android background task, or the launch check.
 */
export async function handleNotificationAction(
  actionIdentifier: string,
  data: Record<string, unknown>,
  notificationId?: string
) {
  const habitId = typeof data?.habitId === 'string' ? data.habitId : null;
  const habitName = typeof data?.habitName === 'string' ? data.habitName : 'Habit';
  if (!habitId) return;

  if (actionIdentifier === ACTION_DONE) {
    await enqueue({ type: 'complete', habitId, date: todayString(), at: Date.now() });
    // The alarm is sticky, so it needs dismissing explicitly.
    if (notificationId) await Notifications.dismissNotificationAsync(notificationId).catch(() => {});
    return;
  }

  if (actionIdentifier === ACTION_SNOOZE) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: habitName,
        body: `Time for ${habitName}`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        sticky: true,
        autoDismiss: false,
        interruptionLevel: 'timeSensitive',
        categoryIdentifier: ALARM_CATEGORY_ID,
        data: { habitId, habitName },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: SNOOZE_MINUTES * 60,
        channelId: ALARM_CHANNEL_ID,
      },
    });
    if (notificationId) await Notifications.dismissNotificationAsync(notificationId).catch(() => {});
  }
}
