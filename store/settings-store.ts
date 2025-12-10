import { logError, logWarn } from '@/utils/logger';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { persistentStorage } from '@/storage/mmkv';
import * as SecureStore from 'expo-secure-store';

const SETTINGS_STORE_KEY = 'app_settings';
const OLD_SECURE_STORE_KEY = 'app_settings'; // For migration

interface AppSettings {
  incomeCalculationEnabled: boolean;
  currency: string; // Global currency code (e.g., 'USD', 'EUR', 'INR')
  theme: 'light' | 'dark' | 'auto'; // Theme preference
  exchangeEnabled: boolean; // Exchange feature (money lent/borrowed tracking)
  defaultTagIds: number[]; // Default tags to pre-select when creating transactions
}

interface SettingsStore {
  settings: AppSettings;
  isLoading: boolean;
  isMigrated: boolean;
  loadSettings: () => Promise<void>;
  migrateFromSecureStore: () => Promise<void>;
  updateIncomeCalculationEnabled: (enabled: boolean) => void;
  updateCurrency: (currency: string) => void;
  updateTheme: (theme: 'light' | 'dark' | 'auto') => void;
  updateExchangeEnabled: (enabled: boolean) => void;
  updateDefaultTagIds: (tagIds: number[]) => void;
}

const defaultSettings: AppSettings = {
  incomeCalculationEnabled: true, // Default to enabled
  currency: 'INR', // Default to INR
  theme: 'auto', // Default to system preference
  exchangeEnabled: true, // Default to enabled
  defaultTagIds: [], // No default tags by default
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isLoading: false,
      isMigrated: false,

      loadSettings: async () => {
        set({ isLoading: true });
        try {
          // Check if migration is needed
          if (!get().isMigrated) {
            await get().migrateFromSecureStore();
          }
        } catch (error) {
          logError('Error loading settings:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      migrateFromSecureStore: async () => {
        try {
          // Try to read from old SecureStore
          const oldData = await SecureStore.getItemAsync(OLD_SECURE_STORE_KEY);
          if (oldData) {
            const loadedSettings = JSON.parse(oldData) as Partial<AppSettings> & { defaultTagId?: number | null };
            
            // Handle migration from old defaultTagId to new defaultTagIds
            const defaultTagIds = loadedSettings.defaultTagIds ?? 
              (loadedSettings.defaultTagId ? [loadedSettings.defaultTagId] : []);
            
            const settings: AppSettings = {
              ...defaultSettings,
              ...loadedSettings,
              defaultTagIds,
            };
            
            // Remove old defaultTagId if it exists
            const { defaultTagId, ...settingsToSave } = settings as any;
            
            // Save to MMKV (via Zustand persist)
            set({ settings: settingsToSave, isMigrated: true });
            
            // Delete from SecureStore after successful migration
            try {
              await SecureStore.deleteItemAsync(OLD_SECURE_STORE_KEY);
              logWarn('✓ Migrated settings from SecureStore to MMKV');
            } catch (deleteError) {
              logWarn('Failed to delete old SecureStore data:', deleteError);
            }
          } else {
            // No old data, mark as migrated
            set({ isMigrated: true });
          }
        } catch (error) {
          logError('Error migrating settings from SecureStore:', error);
          // Mark as migrated anyway to prevent retry loops
          set({ isMigrated: true });
        }
      },

      updateIncomeCalculationEnabled: (enabled: boolean) => {
        set((state) => ({
          settings: {
            ...state.settings,
            incomeCalculationEnabled: enabled,
          },
        }));
      },

      updateCurrency: (currency: string) => {
        set((state) => ({
          settings: {
            ...state.settings,
            currency,
          },
        }));
      },

      updateTheme: (theme: 'light' | 'dark' | 'auto') => {
        set((state) => ({
          settings: {
            ...state.settings,
            theme,
          },
        }));
      },

      updateExchangeEnabled: (enabled: boolean) => {
        set((state) => ({
          settings: {
            ...state.settings,
            exchangeEnabled: enabled,
          },
        }));
      },

      updateDefaultTagIds: (tagIds: number[]) => {
        set((state) => ({
          settings: {
            ...state.settings,
            defaultTagIds: tagIds,
          },
        }));
      },
    }),
    {
      name: SETTINGS_STORE_KEY,
      storage: createJSONStorage(() => persistentStorage),
      // Merge function to handle migration from old defaultTagId
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsStore> | null;
        if (!persisted || !persisted.settings) {
          return currentState;
        }
        
        const persistedSettings = persisted.settings as Partial<AppSettings> & { defaultTagId?: number | null };
        
        // Handle migration from old defaultTagId to new defaultTagIds
        const defaultTagIds = persistedSettings.defaultTagIds ?? 
          (persistedSettings.defaultTagId ? [persistedSettings.defaultTagId] : []);
        
        return {
          ...currentState,
          ...persisted,
          settings: {
            ...defaultSettings,
            ...persistedSettings,
            defaultTagIds,
          },
        };
      },
    }
  )
);

