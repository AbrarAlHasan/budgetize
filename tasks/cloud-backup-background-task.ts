import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { executeAutoCloudBackupIfDue } from '@/services/auto-cloud-backup';
import { reportAutoBackupError } from '@/utils/auto-backup-sentry';

export const CLOUD_BACKUP_BACKGROUND_TASK = 'cloud-backup-background-task';

/** Minimum interval between background checks (platform may delay further). */
export const CLOUD_BACKUP_BACKGROUND_INTERVAL_MINUTES = 60;

// Must be defined in global scope before the app registers the task.
TaskManager.defineTask(CLOUD_BACKUP_BACKGROUND_TASK, async () => {
  try {
    const result = await executeAutoCloudBackupIfDue();
    if (result.ran && !result.success) {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    reportAutoBackupError(error, {
      phase: 'background_task',
      skippedReason: 'background_task_crashed',
    });
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
