import { NotificationConfig, scheduleDailyNotifications } from '@/services/notifications';
import { logError, logWarn } from '@/utils/logger';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { persistentStorage } from '@/storage/mmkv';
import * as SecureStore from 'expo-secure-store';

const NOTIFICATION_STORE_KEY = 'notification_preferences';
const OLD_SECURE_STORE_KEY = 'notification_preferences'; // For migration

interface NotificationPreferences {
  reminder: {
    enabled: boolean;
    frequency: 1 | 2 | 3 | 4;
  };
}

interface NotificationStore {
  preferences: NotificationPreferences;
  isLoading: boolean;
  isMigrated: boolean;
  loadPreferences: () => Promise<void>;
  migrateFromSecureStore: () => Promise<void>;
  updateReminderSettings: (enabled: boolean, frequency: 1 | 2 | 3 | 4) => Promise<void>;
}

const defaultPreferences: NotificationPreferences = {
  reminder: {
    enabled: false,
    frequency: 1,
  },
};

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,
      isLoading: false,
      isMigrated: false,

      loadPreferences: async () => {
        set({ isLoading: true });
        try {
          // Check if migration is needed
          if (!get().isMigrated) {
            await get().migrateFromSecureStore();
          }
        } catch (error) {
          logError('Error loading notification preferences:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      migrateFromSecureStore: async () => {
        try {
          // Try to read from old SecureStore
          const oldData = await SecureStore.getItemAsync(OLD_SECURE_STORE_KEY);
          if (oldData) {
            const preferences = JSON.parse(oldData) as NotificationPreferences;
            
            // Save to MMKV (via Zustand persist)
            set({ preferences, isMigrated: true });
            
            // Delete from SecureStore after successful migration
            try {
              await SecureStore.deleteItemAsync(OLD_SECURE_STORE_KEY);
              logWarn('✓ Migrated notification preferences from SecureStore to MMKV');
            } catch (deleteError) {
              logWarn('Failed to delete old SecureStore data:', deleteError);
            }
          } else {
            // No old data, mark as migrated
            set({ isMigrated: true });
          }
        } catch (error) {
          logError('Error migrating notification preferences from SecureStore:', error);
          // Mark as migrated anyway to prevent retry loops
          set({ isMigrated: true });
        }
      },

      updateReminderSettings: async (enabled: boolean, frequency: 1 | 2 | 3 | 4) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            reminder: {
              enabled,
              frequency,
            },
          },
        }));

        // Schedule notifications
        const config: NotificationConfig = {
          enabled,
          frequency,
          identifier: 'daily_reminder',
          title: 'Expense Reminder',
          body: 'Don\'t forget to log your expenses today!',
        };

        await scheduleDailyNotifications(config);
      },
    }),
    {
      name: NOTIFICATION_STORE_KEY,
      storage: createJSONStorage(() => persistentStorage),
    }
  )
);

