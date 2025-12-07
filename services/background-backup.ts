import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { uploadBackupToCloud } from '@/utils/cloud-backup';
import { useAuthStore } from '@/store/auth-store';
import { getSession } from '@/services/supabase/auth';
import { log, logError, logWarn } from '@/utils/logger';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';

const BACKGROUND_BACKUP_TASK = 'background-backup';
const BACKUP_SCHEDULE_KEY = 'backup_schedule_enabled';
const LAST_BACKUP_KEY = 'last_backup_timestamp';

/**
 * Background task that runs the backup
 */
TaskManager.defineTask(BACKGROUND_BACKUP_TASK, async () => {
  try {
    log('Background backup task started');

    // Check network connectivity
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected || networkState.isInternetReachable === false) {
      logWarn('Background backup skipped: No network connection');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Get user from auth store or session
    let userId: string | null = null;
    
    try {
      const { user, isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated && user?.id) {
        userId = user.id;
      } else {
        // Try to get session directly
        const { session } = await getSession();
        if (session?.user?.id) {
          userId = session.user.id;
        }
      }
    } catch (error) {
      logWarn('Error getting user session:', error);
    }
    
    if (!userId) {
      logWarn('Background backup skipped: User not authenticated');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Check if automatic backups are enabled
    const backupEnabled = await SecureStore.getItemAsync(BACKUP_SCHEDULE_KEY);
    if (backupEnabled !== 'true') {
      log('Background backup skipped: Automatic backups disabled');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Perform backup
    log('Starting background cloud backup...');
    const { error, success } = await uploadBackupToCloud(userId);

    if (error || !success) {
      logError('Background backup failed:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // Store last backup timestamp
    await SecureStore.setItemAsync(LAST_BACKUP_KEY, new Date().toISOString());
    log('Background backup completed successfully');

    // Send a silent notification to confirm backup (optional)
    if (Platform.OS === 'ios') {
      // iOS can show notifications even when app is closed
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Backup Complete',
          body: 'Your data has been backed up to the cloud.',
          sound: false, // Silent notification
          data: { type: 'backup_complete' },
        },
        trigger: null, // Show immediately
      });
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    logError('Background backup task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register background fetch task
 */
export async function registerBackgroundBackup(): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_BACKUP_TASK);
    
    if (isRegistered) {
      log('Background backup task already registered');
      return true;
    }

    // Request permissions
    const { status } = await BackgroundFetch.requestPermissionsAsync();
    
    if (status !== 'granted') {
      logWarn('Background fetch permissions not granted');
      return false;
    }

    // Register the task
    await BackgroundFetch.registerTaskAsync(BACKGROUND_BACKUP_TASK, {
      minimumInterval: 60 * 60 * 24, // 24 hours (minimum on iOS, approximate on Android)
      stopOnTerminate: false, // Continue even if app is terminated
      startOnBoot: true, // Start when device boots
    });

    log('Background backup task registered successfully');
    return true;
  } catch (error) {
    logError('Error registering background backup task:', error);
    return false;
  }
}

/**
 * Unregister background fetch task
 */
export async function unregisterBackgroundBackup(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_BACKUP_TASK);
    
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_BACKUP_TASK);
      log('Background backup task unregistered');
    }
  } catch (error) {
    logError('Error unregistering background backup task:', error);
  }
}

/**
 * Schedule daily backup notification at 10 PM
 * This notification will trigger the backup when received
 */
export async function scheduleDailyBackupNotification(): Promise<void> {
  try {
    // Cancel existing backup notifications
    await Notifications.cancelScheduledNotificationAsync('daily-backup-trigger');

    // Check if automatic backups are enabled
    const backupEnabled = await SecureStore.getItemAsync(BACKUP_SCHEDULE_KEY);
    if (backupEnabled !== 'true') {
      log('Daily backup notification not scheduled: Automatic backups disabled');
      return;
    }

    // Schedule notification for 10 PM daily
    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-backup-trigger',
      content: {
        title: 'Backing up your data',
        body: 'Your data is being backed up to the cloud...',
        sound: false, // Silent notification
        data: { type: 'backup_trigger' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 22, // 10 PM
        minute: 0,
      },
    });

    log('Daily backup notification scheduled for 10 PM');
  } catch (error) {
    logError('Error scheduling daily backup notification:', error);
  }
}

/**
 * Cancel daily backup notification
 */
export async function cancelDailyBackupNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync('daily-backup-trigger');
    log('Daily backup notification cancelled');
  } catch (error) {
    logError('Error canceling daily backup notification:', error);
  }
}

/**
 * Enable automatic daily backups
 */
export async function enableAutomaticBackups(): Promise<boolean> {
  try {
    // Store preference
    await SecureStore.setItemAsync(BACKUP_SCHEDULE_KEY, 'true');

    // Register background task
    const registered = await registerBackgroundBackup();
    if (!registered) {
      logWarn('Failed to register background task, but preference saved');
    }

    // Schedule notification
    await scheduleDailyBackupNotification();

    log('Automatic backups enabled');
    return true;
  } catch (error) {
    logError('Error enabling automatic backups:', error);
    return false;
  }
}

/**
 * Disable automatic daily backups
 */
export async function disableAutomaticBackups(): Promise<void> {
  try {
    // Remove preference
    await SecureStore.deleteItemAsync(BACKUP_SCHEDULE_KEY);

    // Unregister background task
    await unregisterBackgroundBackup();

    // Cancel notification
    await cancelDailyBackupNotification();

    log('Automatic backups disabled');
  } catch (error) {
    logError('Error disabling automatic backups:', error);
  }
}

/**
 * Check if automatic backups are enabled
 */
export async function isAutomaticBackupEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(BACKUP_SCHEDULE_KEY);
    return enabled === 'true';
  } catch (error) {
    logError('Error checking automatic backup status:', error);
    return false;
  }
}

/**
 * Get last backup timestamp
 */
export async function getLastBackupTimestamp(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(LAST_BACKUP_KEY);
  } catch (error) {
    logError('Error getting last backup timestamp:', error);
    return null;
  }
}

/**
 * Initialize backup scheduler
 * Call this when app starts
 */
export async function initializeBackupScheduler(): Promise<void> {
  try {
    const enabled = await isAutomaticBackupEnabled();
    
    if (enabled) {
      // Register background task
      await registerBackgroundBackup();
      
      // Schedule notification
      await scheduleDailyBackupNotification();
      
      log('Backup scheduler initialized');
    } else {
      log('Backup scheduler not initialized: Automatic backups disabled');
    }
  } catch (error) {
    logError('Error initializing backup scheduler:', error);
  }
}

