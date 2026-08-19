import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { handleNotificationAction } from './notificationActions';
import { notificationsSupported } from './notificationConstants';

export const BACKGROUND_NOTIFICATION_TASK = 'habit-alarm-action';

/**
 * Handles alarm buttons pressed while the app is backgrounded or terminated.
 * On Android this is the only path that runs in those states, so without it
 * "Done" would silently do nothing unless the app happened to be open.
 *
 * Must be defined in module scope of something imported early (see index.ts) —
 * the OS loads the JS bundle fresh to run this, and the task has to already be
 * defined by the time it does.
 */
TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  BACKGROUND_NOTIFICATION_TASK,
  async ({ data, error }) => {
    if (error || !data) return;
    // The same task fires for plain deliveries too; only responses carry this.
    if (!('actionIdentifier' in data)) return;
    const response = data as unknown as Notifications.NotificationResponse;
    await handleNotificationAction(
      response.actionIdentifier,
      (response.notification?.request?.content?.data ?? {}) as Record<string, unknown>,
      response.notification?.request?.identifier
    );
  }
);

export function registerBackgroundNotificationTask() {
  if (!notificationsSupported) return;
  Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(() => {});
}
