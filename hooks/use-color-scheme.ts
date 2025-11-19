import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/settings-store';

export function useColorScheme() {
  const systemColorScheme = useRNColorScheme();
  const { settings } = useSettingsStore();
  
  // If theme is set to 'auto', use system preference
  // Otherwise use the manually selected theme
  if (settings.theme === 'auto') {
    return systemColorScheme;
  }
  
  return settings.theme as 'light' | 'dark';
}
