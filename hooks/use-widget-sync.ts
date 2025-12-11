import { syncWidgetData } from '@/services/widget-sync';
import { useSettingsStore } from '@/store/settings-store';
import { logError } from '@/utils/logger';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Hook to sync widget data automatically
 * - Syncs on mount (after initial delay to ensure DB is ready)
 * - Syncs when currency changes
 * - Syncs when app comes to foreground
 */
export function useWidgetSync() {
  const currency = useSettingsStore((state) => state.settings.currency);
  const hasSyncedOnMount = useRef(false);

  useEffect(() => {
    // Sync on mount with a small delay to ensure database is initialized
    if (!hasSyncedOnMount.current) {
      hasSyncedOnMount.current = true;
      // Small delay to ensure database and settings are loaded
      const timeoutId = setTimeout(() => {
        syncWidgetData().catch((error) => {
          logError('Failed to sync widget data on mount:', error);
        });
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    // Sync when currency changes
    if (hasSyncedOnMount.current) {
      syncWidgetData().catch((error) => {
        logError('Failed to sync widget data on currency change:', error);
      });
    }
  }, [currency]);

  useEffect(() => {
    // Sync when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && hasSyncedOnMount.current) {
        syncWidgetData().catch((error) => {
          logError('Failed to sync widget data on app foreground:', error);
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
