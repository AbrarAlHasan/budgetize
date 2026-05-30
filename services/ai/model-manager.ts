import { Platform } from 'react-native';

import {
  deleteOnDeviceModelResources,
  onDeviceExecutorchProvider,
} from '@/services/ai/providers/on-device-provider';
import {
  getModelCatalogEntry,
  type AiOnDeviceModelId,
} from '@/services/ai/model-catalog';
import { useSettingsStore } from '@/store/settings-store';
import { logError } from '@/utils/logger';

export interface ModelDownloadProgress {
  totalBytes: number;
  downloadedBytes: number;
  progress: number;
}

function mapProgress(progress: number): ModelDownloadProgress {
  const normalized = Math.min(100, Math.max(0, progress * 100));
  return {
    totalBytes: 100,
    downloadedBytes: normalized,
    progress: normalized,
  };
}

export async function isModelDownloaded(): Promise<boolean> {
  const { settings } = useSettingsStore.getState();

  if (settings.aiExecutionMode === 'cloud') {
    return false;
  }

  return settings.aiDownloadedModelId === settings.aiOnDeviceModelId;
}

export async function downloadModel(
  options: {
    allowCellular?: boolean;
    onProgress?: (progress: ModelDownloadProgress) => void;
  } = {}
): Promise<void> {
  const { allowCellular = false, onProgress } = options;

  await onDeviceExecutorchProvider.load({
    allowCellular,
    onProgress: (progress) => onProgress?.(mapProgress(progress)),
  });
}

export async function deleteModel(): Promise<void> {
  try {
    const { settings } = useSettingsStore.getState();
    const modelId = settings.aiOnDeviceModelId;

    await onDeviceExecutorchProvider.unload();
    await deleteOnDeviceModelResources(modelId);
    useSettingsStore.getState().updateAiDownloadedModelId(null);
  } catch (error) {
    logError('Failed to delete AI model:', error);
    throw error;
  }
}

export async function getModelFileSize(): Promise<number | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const { settings } = useSettingsStore.getState();
    const modelConfig = getModelCatalogEntry(settings.aiOnDeviceModelId).resolve();
    const { ExpoResourceFetcher } = await import(
      'react-native-executorch-expo-resource-fetcher'
    );

    return await ExpoResourceFetcher.getFilesTotalSize(
      modelConfig.modelSource,
      modelConfig.tokenizerSource,
      modelConfig.tokenizerConfigSource
    );
  } catch {
    return null;
  }
}

export function getActiveModelId(): AiOnDeviceModelId {
  return useSettingsStore.getState().settings.aiOnDeviceModelId;
}
