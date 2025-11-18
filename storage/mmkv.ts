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


