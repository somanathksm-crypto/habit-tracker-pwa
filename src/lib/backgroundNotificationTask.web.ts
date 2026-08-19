/**
 * Web build of the background alarm-action task.
 *
 * `expo-task-manager` has no web implementation, and defining a task at module
 * scope would break the web bundle — this file is imported from the entry
 * point, so it runs on every platform. Kept as a `.web.ts` sibling so Metro
 * resolves it for web and never pulls the native module in.
 *
 * Nothing to do here: the web build has no alarms to act on.
 */
export const BACKGROUND_NOTIFICATION_TASK = 'habit-alarm-action';

export function registerBackgroundNotificationTask() {}
