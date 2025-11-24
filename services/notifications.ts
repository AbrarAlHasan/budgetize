import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';
import { log, logError, logWarn } from '@/utils/logger';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationSchedule {
  identifier: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
}

export interface NotificationConfig {
  enabled: boolean;
  frequency: 1 | 2 | 3 | 4;
  identifier: string; // Unique identifier for this notification type
  title: string;
  body: string;
}

// Time configurations for different frequencies
export const REMINDER_TIMES: Record<1 | 2 | 3 | 4, Array<{ hour: number; minute: number; label: string }>> = {
  1: [{ hour: 21, minute: 0, label: 'Night (9:00 PM)' }],
  2: [
    { hour: 14, minute: 0, label: 'Afternoon (2:00 PM)' },
    { hour: 21, minute: 0, label: 'Night (9:00 PM)' },
  ],
  3: [
    { hour: 10, minute: 0, label: 'Mid Morning (10:00 AM)' },
    { hour: 15, minute: 0, label: 'Mid Afternoon (3:00 PM)' },
    { hour: 21, minute: 0, label: 'Night (9:00 PM)' },
  ],
  4: [
    { hour: 8, minute: 0, label: 'Morning (8:00 AM)' },
    { hour: 13, minute: 0, label: 'Afternoon (1:00 PM)' },
    { hour: 18, minute: 0, label: 'Evening (6:00 PM)' },
    { hour: 21, minute: 0, label: 'Night (9:00 PM)' },
  ],
};

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logWarn('Notification permissions not granted');
      return false;
    }

    // For Android, we need to create a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  } catch (error) {
    logError('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Cancel all notifications for a specific identifier prefix
 */
export async function cancelNotifications(identifierPrefix: string): Promise<void> {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const notificationsToCancel = allNotifications.filter((notification) =>
      notification.identifier.startsWith(identifierPrefix)
    );

    // Cancel all matching notifications
    const cancelPromises = notificationsToCancel.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier)
    );

    await Promise.all(cancelPromises);

    // Verify cancellation (optional, for debugging)
    if (notificationsToCancel.length > 0) {
      log(`Canceled ${notificationsToCancel.length} notification(s) with prefix: ${identifierPrefix}`);
    }
  } catch (error) {
    logError('Error canceling notifications:', error);
  }
}

/**
 * Schedule daily recurring notifications
 */
export async function scheduleDailyNotifications(
  config: NotificationConfig
): Promise<void> {
  // Always cancel existing notifications first, regardless of enabled state
  // This ensures old notifications are removed when frequency changes
  await cancelNotifications(config.identifier);

  if (!config.enabled) {
    // If disabled, we've already canceled, so just return
    return;
  }

  // Get the times for the selected frequency
  const times = REMINDER_TIMES[config.frequency];

  // Schedule each notification
  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    const identifier = `${config.identifier}_${i}`;

    try {
      // Use DailyTriggerInput format which is specifically designed for daily recurring notifications
      // This format automatically handles scheduling for the next occurrence
      // If the time has passed today, it will schedule for tomorrow automatically
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: config.title,
          body: config.body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
          // DailyTriggerInput automatically schedules for the next occurrence
          // If the time has passed today, it schedules for tomorrow
        },
      });
    } catch (error) {
      logError(`Error scheduling notification ${identifier}:`, error);
    }
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    logError('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    logError('Error checking notification permissions:', error);
    return false;
  }
}

