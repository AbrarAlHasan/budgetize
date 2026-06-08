import {
  releaseAutoCloudBackupLock,
  tryAcquireAutoCloudBackupLock,
} from '@/services/auto-cloud-backup-lock';
import { getSession } from '@/services/supabase/auth';
import { cloudBackupScheduleStorage } from '@/storage/cloud-backup-schedule';
import { reportAutoBackupError, reportAutoBackupFailure } from '@/utils/auto-backup-sentry';
import { uploadBackupToCloud } from '@/utils/cloud-backup';
import {
  formatLocalDateKey,
  shouldRunAutomaticCloudBackup,
} from '@/utils/cloud-backup-schedule';
import { log } from '@/utils/logger';
import { AppState } from 'react-native';

export interface AutoCloudBackupResult {
  ran: boolean;
  success: boolean;
  skippedReason?: string;
}

function isCatchUpBackup(lastBackupDate: string | null, now: Date = new Date()): boolean {
  const today = formatLocalDateKey(now);
  return lastBackupDate !== null && lastBackupDate < today;
}

/**
 * Runs a cloud backup when automatic backup is enabled and the schedule says it is due.
 * Heavy local backup work runs only while the app is in the foreground.
 */
export async function executeAutoCloudBackupIfDue(): Promise<AutoCloudBackupResult> {
  if (!tryAcquireAutoCloudBackupLock()) {
    return { ran: false, success: false, skippedReason: 'already_running' };
  }

  try {
    const appState = AppState.currentState;
    if (appState !== 'active') {
      log('Auto cloud backup skipped: app is not in foreground', appState);
      return { ran: false, success: false, skippedReason: 'app_background' };
    }

    if (!cloudBackupScheduleStorage.isAutoBackupEnabled()) {
      return { ran: false, success: false, skippedReason: 'auto_backup_disabled' };
    }

    const lastBackupDate = cloudBackupScheduleStorage.getLastBackupDate();
    if (!shouldRunAutomaticCloudBackup(lastBackupDate)) {
      return { ran: false, success: false, skippedReason: 'not_due' };
    }

    const catchUp = isCatchUpBackup(lastBackupDate);

    const { session, error: sessionError } = await getSession();
    if (sessionError) {
      reportAutoBackupFailure('Session check failed during auto backup', {
        phase: 'session',
        skippedReason: 'session_error',
        lastBackupDate,
        appState,
        isCatchUp: catchUp,
      }, sessionError);
      return { ran: false, success: false, skippedReason: 'session_error' };
    }

    const userId = session?.user?.id;
    if (!userId) {
      return { ran: false, success: false, skippedReason: 'not_authenticated' };
    }

    log('Auto cloud backup: starting upload for user', userId);

    const { error, success, backupStep } = await uploadBackupToCloud(userId);
    if (error || !success) {
      reportAutoBackupFailure('Cloud backup upload failed', {
        phase: 'upload',
        skippedReason: 'upload_failed',
        userId,
        lastBackupDate,
        uploadSuccess: success,
        appState,
        isCatchUp: catchUp,
        backupStep: backupStep ?? undefined,
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
      appState: AppState.currentState,
    });
    return { ran: true, success: false, skippedReason: 'unexpected_error' };
  } finally {
    releaseAutoCloudBackupLock();
  }
}
