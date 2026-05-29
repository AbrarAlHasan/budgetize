import * as BackgroundTask from 'expo-background-task';
import { Platform } from 'react-native';
import { reportAutoBackupFailure } from '@/utils/auto-backup-sentry';

export type CloudBackupBackgroundUnavailableReason =
  | 'restricted'
  | 'status_unknown';

export interface CloudBackupBackgroundAvailability {
  available: boolean;
  reason?: CloudBackupBackgroundUnavailableReason;
  /** User-facing explanation */
  message?: string;
}

const RESTRICTED_MESSAGES: Record<string, string> = {
  ios: 'Background tasks are disabled on this device. Enable Background App Refresh for Budgetize in Settings → General → Background App Refresh.',
  android:
    'Background tasks are limited on this device. Disable battery restrictions for Budgetize in system settings (Settings → Apps → Budgetize → Battery).',
  default:
    'Automatic background backup is not available on this device.',
};

/**
 * Checks whether expo-background-task can run on this device.
 * No runtime permission prompt is required on either platform — this API uses
 * WorkManager (Android) and BGTaskScheduler (iOS), which are configured at build time.
 */
export async function getCloudBackupBackgroundAvailability(): Promise<CloudBackupBackgroundAvailability> {
  try {
    const status = await BackgroundTask.getStatusAsync();

    if (status === BackgroundTask.BackgroundTaskStatus.Available) {
      return { available: true };
    }

    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
      const platformKey = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'default';
      const message = RESTRICTED_MESSAGES[platformKey];

      reportAutoBackupFailure('Background task API restricted on device', {
        phase: 'availability_check',
        skippedReason: 'background_restricted',
        platform: Platform.OS,
      });

      return {
        available: false,
        reason: 'restricted',
        message,
      };
    }

    return {
      available: false,
      reason: 'status_unknown',
      message: RESTRICTED_MESSAGES.default,
    };
  } catch (error) {
    reportAutoBackupFailure('Failed to check background task availability', {
      phase: 'availability_check',
      skippedReason: 'availability_check_failed',
      platform: Platform.OS,
    }, error);

    return {
      available: false,
      reason: 'status_unknown',
      message: RESTRICTED_MESSAGES.default,
    };
  }
}
