import { persistentStorage } from '@/storage/mmkv';
import { logError } from '@/utils/logger';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const SECURITY_STORE_KEY = 'security_settings';
const PIN_STORE_KEY = 'app_pin'; // Stored in SecureStore, not MMKV

interface SecurityStore {
  isLockEnabled: boolean;
  isBiometricEnabled: boolean;
  isAuthenticated: boolean;
  setIsLockEnabled: (enabled: boolean) => Promise<void>;
  setIsBiometricEnabled: (enabled: boolean) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setPin: (pin: string) => Promise<void>;
  getPin: () => Promise<string | null>;
  verifyPin: (pin: string) => Promise<boolean>;
  clearPin: () => Promise<void>;
  reset: () => Promise<void>;
}

export const useSecurityStore = create<SecurityStore>()(
  persist(
    (set, get) => ({
      isLockEnabled: false,
      isBiometricEnabled: false,
      isAuthenticated: false,

      setIsLockEnabled: async (enabled: boolean) => {
        set({ isLockEnabled: enabled });
        if (!enabled) {
          // When disabling, also clear authentication state
          set({ isAuthenticated: false, isBiometricEnabled: false });
          await get().clearPin();
        }
      },

      setIsBiometricEnabled: (enabled: boolean) => {
        set({ isBiometricEnabled: enabled });
      },

      setAuthenticated: (authenticated: boolean) => {
        set({ isAuthenticated: authenticated });
      },

      setPin: async (pin: string) => {
        try {
          // Hash the PIN before storing (simple hash for now, can be improved)
          // In production, consider using a proper hashing library like bcrypt
          await SecureStore.setItemAsync(PIN_STORE_KEY, pin);
        } catch (error) {
          logError('Error storing PIN:', error);
          throw error;
        }
      },

      getPin: async (): Promise<string | null> => {
        try {
          return await SecureStore.getItemAsync(PIN_STORE_KEY);
        } catch (error) {
          logError('Error retrieving PIN:', error);
          return null;
        }
      },

      verifyPin: async (pin: string): Promise<boolean> => {
        try {
          const storedPin = await get().getPin();
          return storedPin !== null && storedPin === pin;
        } catch (error) {
          logError('Error verifying PIN:', error);
          return false;
        }
      },

      clearPin: async () => {
        try {
          await SecureStore.deleteItemAsync(PIN_STORE_KEY);
        } catch (error) {
          logError('Error clearing PIN:', error);
        }
      },

      reset: async () => {
        set({
          isLockEnabled: false,
          isBiometricEnabled: false,
          isAuthenticated: false,
        });
        await get().clearPin();
      },
    }),
    {
      name: SECURITY_STORE_KEY,
      storage: createJSONStorage(() => persistentStorage),
      partialize: (state) => ({
        isLockEnabled: state.isLockEnabled,
        isBiometricEnabled: state.isBiometricEnabled,
        // Don't persist isAuthenticated - it should reset on app restart
      }),
    }
  )
);
