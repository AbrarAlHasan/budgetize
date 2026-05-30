import {
  DEFAULT_AI_ON_DEVICE_MODEL_ID,
  type AiOnDeviceModelId,
} from '@/services/ai/model-catalog';
import type { AiExecutionMode } from '@/services/ai/providers/types';
import { reloadInferenceProvider } from '@/services/ai/providers/inference-router';
import { persistentStorage } from '@/storage/mmkv';
import { logError, logWarn } from '@/utils/logger';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const SETTINGS_STORE_KEY = 'app_settings';
const OLD_SECURE_STORE_KEY = 'app_settings'; // For migration

interface AppSettings {
  incomeCalculationEnabled: boolean;
  currency: string; // Global currency code (e.g., 'USD', 'EUR', 'INR')
  theme: 'light' | 'dark' | 'auto'; // Theme preference
  exchangeEnabled: boolean; // Exchange feature (money lent/borrowed tracking)
  defaultTagIds: number[]; // Default tags to pre-select when creating transactions
  aiEnabled: boolean;
  aiUseCellularDownload: boolean;
  aiExecutionMode: AiExecutionMode;
  aiOnDeviceModelId: AiOnDeviceModelId;
  aiDownloadedModelId: AiOnDeviceModelId | null;
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
  updateAiEnabled: (enabled: boolean) => void;
  updateAiUseCellularDownload: (enabled: boolean) => void;
  updateAiExecutionMode: (mode: AiExecutionMode) => void;
  updateAiOnDeviceModelId: (modelId: AiOnDeviceModelId) => void;
  updateAiDownloadedModelId: (modelId: AiOnDeviceModelId | null) => void;
}

const defaultSettings: AppSettings = {
  incomeCalculationEnabled: true, // Default to enabled
  currency: 'INR', // Default to INR
  theme: 'auto', // Default to system preference
  exchangeEnabled: true, // Default to enabled
  defaultTagIds: [], // No default tags by default
  aiEnabled: true,
  aiUseCellularDownload: false,
  aiExecutionMode: 'on_device',
  aiOnDeviceModelId: DEFAULT_AI_ON_DEVICE_MODEL_ID,
  aiDownloadedModelId: null,
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

      updateAiEnabled: (enabled: boolean) => {
        set((state) => ({
          settings: {
            ...state.settings,
            aiEnabled: enabled,
          },
        }));
      },

      updateAiUseCellularDownload: (enabled: boolean) => {
        set((state) => ({
          settings: {
            ...state.settings,
            aiUseCellularDownload: enabled,
          },
        }));
      },

      updateAiExecutionMode: (mode: AiExecutionMode) => {
        set((state) => ({
          settings: {
            ...state.settings,
            aiExecutionMode: mode,
          },
        }));
        reloadInferenceProvider().catch((error) => {
          logError('Failed to reload AI provider after execution mode change:', error);
        });
      },

      updateAiOnDeviceModelId: (modelId: AiOnDeviceModelId) => {
        set((state) => ({
          settings: {
            ...state.settings,
            aiOnDeviceModelId: modelId,
          },
        }));
        reloadInferenceProvider().catch((error) => {
          logError('Failed to reload AI provider after model change:', error);
        });
      },

      updateAiDownloadedModelId: (modelId: AiOnDeviceModelId | null) => {
        set((state) => ({
          settings: {
            ...state.settings,
            aiDownloadedModelId: modelId,
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

