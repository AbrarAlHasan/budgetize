import { create } from 'zustand';
import { scheduleDailyNotifications, NotificationConfig } from '@/services/notifications';
import * as SecureStore from 'expo-secure-store';

const NOTIFICATION_STORE_KEY = 'notification_preferences';

interface NotificationPreferences {
  reminder: {
    enabled: boolean;
    frequency: 1 | 2 | 3 | 4;
  };
}

interface NotificationStore {
  preferences: NotificationPreferences;
  isLoading: boolean;
  loadPreferences: () => Promise<void>;
  updateReminderSettings: (enabled: boolean, frequency: 1 | 2 | 3 | 4) => Promise<void>;
  savePreferences: () => Promise<void>;
}

const defaultPreferences: NotificationPreferences = {
  reminder: {
    enabled: false,
    frequency: 1,
  },
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  preferences: defaultPreferences,
  isLoading: false,

  loadPreferences: async () => {
    set({ isLoading: true });
    try {
      const stored = await SecureStore.getItemAsync(NOTIFICATION_STORE_KEY);
      if (stored) {
        const preferences = JSON.parse(stored) as NotificationPreferences;
        set({ preferences });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateReminderSettings: async (enabled: boolean, frequency: 1 | 2 | 3 | 4) => {
    const newPreferences: NotificationPreferences = {
      ...get().preferences,
      reminder: {
        enabled,
        frequency,
      },
    };

    set({ preferences: newPreferences });

    // Save to secure store
    try {
      await SecureStore.setItemAsync(NOTIFICATION_STORE_KEY, JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }

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

  savePreferences: async () => {
    try {
      await SecureStore.setItemAsync(NOTIFICATION_STORE_KEY, JSON.stringify(get().preferences));
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  },
}));

