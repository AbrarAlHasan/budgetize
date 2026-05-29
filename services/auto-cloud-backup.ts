import { getSession } from '@/services/supabase/auth';
import { cloudBackupScheduleStorage } from '@/storage/cloud-backup-schedule';
import { reportAutoBackupError, reportAutoBackupFailure } from '@/utils/auto-backup-sentry';
import { uploadBackupToCloud } from '@/utils/cloud-backup';
import {
  formatLocalDateKey,
  shouldRunAutomaticCloudBackup,
} from '@/utils/cloud-backup-schedule';
import { log } from '@/utils/logger';

export interface AutoCloudBackupResult {
  ran: boolean;
  success: boolean;
  skippedReason?: string;
}

/**
 * Runs a cloud backup when automatic backup is enabled and the schedule says it is due.
 */
export async function executeAutoCloudBackupIfDue(): Promise<AutoCloudBackupResult> {
  try {
    if (!cloudBackupScheduleStorage.isAutoBackupEnabled()) {
      return { ran: false, success: false, skippedReason: 'auto_backup_disabled' };
    }

    const lastBackupDate = cloudBackupScheduleStorage.getLastBackupDate();
    if (!shouldRunAutomaticCloudBackup(lastBackupDate)) {
      return { ran: false, success: false, skippedReason: 'not_due' };
    }

    const { session, error: sessionError } = await getSession();
    if (sessionError) {
      reportAutoBackupFailure('Session check failed during auto backup', {
        phase: 'session',
        skippedReason: 'session_error',
        lastBackupDate,
      }, sessionError);
      return { ran: false, success: false, skippedReason: 'session_error' };
    }

    const userId = session?.user?.id;
    if (!userId) {
      return { ran: false, success: false, skippedReason: 'not_authenticated' };
    }

    log('Auto cloud backup: starting upload for user', userId);

    const { error, success } = await uploadBackupToCloud(userId);
    if (error || !success) {
      reportAutoBackupFailure('Cloud backup upload failed', {
        phase: 'upload',
        skippedReason: 'upload_failed',
        userId,
        lastBackupDate,
        uploadSuccess: success,
      }, error ?? new Error('Upload returned without success'));
      return { ran: true, success: false, skippedReason: 'upload_failed' };
    }

    cloudBackupScheduleStorage.setLastBackupDate(formatLocalDateKey());
    log('Auto cloud backup: completed successfully');
    return { ran: true, success: true };
  } catch (error) {
    reportAutoBackupError(error, {
      phase: 'execute',
      skippedReason: 'unexpected_error',
      lastBackupDate: cloudBackupScheduleStorage.getLastBackupDate(),
    });
    return { ran: true, success: false, skippedReason: 'unexpected_error' };
  }
}
