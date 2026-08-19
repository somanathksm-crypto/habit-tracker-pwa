import { Platform } from 'react-native';

/**
 * Shared by both the scheduler and the action handler. Kept in its own module
 * so those two can import from here instead of from each other — they each
 * need values from the other, which would otherwise be a cycle.
 */
export const ALARM_CHANNEL_ID = 'habit-alarms';
export const ALARM_CATEGORY_ID = 'habit-alarm';

/** Long buzz-pause-buzz, so it reads as an alarm rather than a passing ping. */
export const VIBRATION_PATTERN = [0, 700, 400, 700, 400, 700];

/**
 * Reminders are local scheduled notifications — no server involved. They only
 * exist on native; the web build keeps the same settings UI but every call is
 * a no-op, since browsers can't schedule anything without push infrastructure.
 */
export const notificationsSupported = Platform.OS !== 'web';
