import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

// Create MMKV instance for fast persistent storage
export const mmkv = createMMKV({
  id: 'moneyManagerStorage',
});

// Zustand storage adapter for MMKV
export const persistentStorage: StateStorage = {
  setItem: (name, value) => {
    mmkv.set(name, value);
  },
  getItem: (name) => {
    return mmkv.getString(name) ?? null;
  },
  removeItem: (name) => {
    mmkv.remove(name);
  },
};

// Async storage adapter for Supabase (and other libraries that need async storage)
export const asyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = mmkv.getString(key);
      return value ?? null;
    } catch (error) {
      console.error('MMKV getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      mmkv.set(key, value);
    } catch (error) {
      console.error('MMKV setItem error:', error);
      throw error;
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      mmkv.remove(key);
    } catch (error) {
      console.error('MMKV removeItem error:', error);
      throw error;
    }
  },
};


