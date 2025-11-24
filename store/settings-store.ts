import { logError } from '@/utils/logger';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const SETTINGS_STORE_KEY = 'app_settings';

interface AppSettings {
  incomeCalculationEnabled: boolean;
  currency: string; // Global currency code (e.g., 'USD', 'EUR', 'INR')
  theme: 'light' | 'dark' | 'auto'; // Theme preference
}

interface SettingsStore {
  settings: AppSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateIncomeCalculationEnabled: (enabled: boolean) => Promise<void>;
  updateCurrency: (currency: string) => Promise<void>;
  updateTheme: (theme: 'light' | 'dark' | 'auto') => Promise<void>;
}

const defaultSettings: AppSettings = {
  incomeCalculationEnabled: true, // Default to enabled
  currency: 'INR', // Default to INR
  theme: 'auto', // Default to system preference
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const stored = await SecureStore.getItemAsync(SETTINGS_STORE_KEY);
      if (stored) {
        const loadedSettings = JSON.parse(stored) as Partial<AppSettings>;
        // Merge with defaults to ensure all fields exist
        const settings: AppSettings = {
          ...defaultSettings,
          ...loadedSettings,
        };
        set({ settings });
        
        // Save back to ensure all fields are present in storage
        await SecureStore.setItemAsync(SETTINGS_STORE_KEY, JSON.stringify(settings));
      }
    } catch (error) {
      logError('Error loading settings:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateIncomeCalculationEnabled: async (enabled: boolean) => {
    const newSettings: AppSettings = {
      ...get().settings,
      incomeCalculationEnabled: enabled,
    };

    set({ settings: newSettings });

    // Save to secure store
    try {
      await SecureStore.setItemAsync(SETTINGS_STORE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      logError('Error saving settings:', error);
    }
  },

  updateCurrency: async (currency: string) => {
    const newSettings: AppSettings = {
      ...get().settings,
      currency,
    };

    set({ settings: newSettings });

    // Save to secure store
    try {
      await SecureStore.setItemAsync(SETTINGS_STORE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      logError('Error saving settings:', error);
    }
  },

  updateTheme: async (theme: 'light' | 'dark' | 'auto') => {
    const newSettings: AppSettings = {
      ...get().settings,
      theme,
    };

    set({ settings: newSettings });

    // Save to secure store
    try {
      await SecureStore.setItemAsync(SETTINGS_STORE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      logError('Error saving settings:', error);
    }
  },
}));

