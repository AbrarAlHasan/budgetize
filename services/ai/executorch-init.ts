import { Platform } from 'react-native';

let initialized = false;

export function initExecutorchRuntime(): void {
  if (initialized || Platform.OS === 'web') {
    return;
  }

  const { initExecutorch } = require('react-native-executorch');
  const { ExpoResourceFetcher } = require('react-native-executorch-expo-resource-fetcher');

  initExecutorch({
    resourceFetcher: ExpoResourceFetcher,
  });

  initialized = true;
}

export function isExecutorchInitialized(): boolean {
  return initialized;
}
