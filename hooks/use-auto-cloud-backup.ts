import { executeAutoCloudBackupIfDue } from '@/services/auto-cloud-backup';
import {
  registerCloudBackupBackgroundTask,
  unregisterCloudBackupBackgroundTask,
} from '@/services/cloud-backup-background-registration';
import { cloudBackupScheduleStorage } from '@/storage/cloud-backup-schedule';
import { useAuthStore } from '@/store/auth-store';
import { reportAutoBackupError } from '@/utils/auto-backup-sentry';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Registers OS background work for daily cloud backup and runs catch-up
 * when the app returns to the foreground (e.g. if the OS missed the 10 PM window).
 */
export function useAutoCloudBackup(): void {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasRunForegroundCatchUpRef = useRef(false);

  useEffect(() => {
    const syncBackgroundRegistration = async (): Promise<void> => {
      const autoEnabled = cloudBackupScheduleStorage.isAutoBackupEnabled();
      if (isAuthenticated && autoEnabled) {
        await registerCloudBackupBackgroundTask();
      } else {
        await unregisterCloudBackupBackgroundTask();
      }
    };

    syncBackgroundRegistration().catch((error) => {
      reportAutoBackupError(error, { phase: 'sync_background_registration' });
    });
  }, [isAuthenticated]);

  useEffect(() => {
    const runCatchUp = async (): Promise<void> => {
      if (!isAuthenticated || !cloudBackupScheduleStorage.isAutoBackupEnabled()) {
        return;
      }

      await executeAutoCloudBackupIfDue();
    };

    if (!hasRunForegroundCatchUpRef.current && isAuthenticated) {
      hasRunForegroundCatchUpRef.current = true;
      const timeoutId = setTimeout(() => {
        runCatchUp().catch((error) => {
          reportAutoBackupError(error, { phase: 'initial_catch_up_timeout' });
        });
      }, 2500);

      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState !== 'active') {
          return;
        }
        if (!isAuthenticated || !cloudBackupScheduleStorage.isAutoBackupEnabled()) {
          return;
        }

        executeAutoCloudBackupIfDue().catch((error) => {
          reportAutoBackupError(error, { phase: 'foreground_catch_up' });
        });
      }
    );

    return () => subscription.remove();
  }, [isAuthenticated]);
}
