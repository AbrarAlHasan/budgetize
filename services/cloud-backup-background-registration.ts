import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { getCloudBackupBackgroundAvailability } from '@/services/cloud-backup-background-availability';
import {
  CLOUD_BACKUP_BACKGROUND_INTERVAL_MINUTES,
  CLOUD_BACKUP_BACKGROUND_TASK,
} from '@/tasks/cloud-backup-background-task';
import { reportAutoBackupError } from '@/utils/auto-backup-sentry';
import { log } from '@/utils/logger';

export interface RegisterCloudBackupBackgroundTaskResult {
  registered: boolean;
  restricted: boolean;
  message?: string;
}

export async function registerCloudBackupBackgroundTask(): Promise<RegisterCloudBackupBackgroundTaskResult> {
  try {
    const availability = await getCloudBackupBackgroundAvailability();
    if (!availability.available) {
      log(
        'Cloud backup background task unavailable:',
        availability.message ?? availability.reason
      );
      return {
        registered: false,
        restricted: availability.reason === 'restricted',
        message: availability.message,
      };
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      CLOUD_BACKUP_BACKGROUND_TASK
    );
    if (isRegistered) {
      return { registered: true, restricted: false };
    }

    await BackgroundTask.registerTaskAsync(CLOUD_BACKUP_BACKGROUND_TASK, {
      minimumInterval: CLOUD_BACKUP_BACKGROUND_INTERVAL_MINUTES,
    });
    log('Cloud backup background task registered');
    return { registered: true, restricted: false };
  } catch (error) {
    reportAutoBackupError(error, { phase: 'register_background_task' });
    throw error;
  }
}

export async function unregisterCloudBackupBackgroundTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      CLOUD_BACKUP_BACKGROUND_TASK
    );
    if (!isRegistered) {
      return;
    }

    await BackgroundTask.unregisterTaskAsync(CLOUD_BACKUP_BACKGROUND_TASK);
    log('Cloud backup background task unregistered');
  } catch (error) {
    reportAutoBackupError(error, { phase: 'unregister_background_task' });
    throw error;
  }
}
