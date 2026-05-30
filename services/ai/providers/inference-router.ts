import { useSettingsStore } from '@/store/settings-store';

import { cloudAiProvider } from './cloud-provider';
import { onDeviceExecutorchProvider } from './on-device-provider';
import type { AiInferenceProvider } from './types';

export function getActiveInferenceProvider(): AiInferenceProvider {
  const { aiExecutionMode } = useSettingsStore.getState().settings;

  if (aiExecutionMode === 'cloud') {
    return cloudAiProvider;
  }

  return onDeviceExecutorchProvider;
}

export async function reloadInferenceProvider(): Promise<void> {
  await onDeviceExecutorchProvider.unload();
}
