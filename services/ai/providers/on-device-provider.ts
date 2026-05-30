import { Platform } from 'react-native';
import * as Network from 'expo-network';

import { initExecutorchRuntime } from '@/services/ai/executorch-init';
import {
  getModelCatalogEntry,
  type AiOnDeviceModelId,
} from '@/services/ai/model-catalog';
import { useSettingsStore } from '@/store/settings-store';
import { logError } from '@/utils/logger';

import type {
  AiCompletionMessage,
  AiCompletionOptions,
  AiInferenceProvider,
} from './types';

type LLMModuleInstance = {
  configure: (config: {
    generationConfig?: { temperature?: number; topP?: number };
    chatConfig?: {
      systemPrompt: string;
      initialMessageHistory: AiCompletionMessage[];
    };
  }) => void;
  generate: (messages: AiCompletionMessage[]) => Promise<string>;
  delete: () => void;
};

let llmInstance: LLMModuleInstance | null = null;
let loadedModelId: AiOnDeviceModelId | null = null;
let loadPromise: Promise<void> | null = null;

async function isWifiConnected(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.type === Network.NetworkStateType.WIFI;
  } catch {
    return false;
  }
}

function getSelectedModelId(): AiOnDeviceModelId {
  return useSettingsStore.getState().settings.aiOnDeviceModelId;
}

class OnDeviceExecutorchProvider implements AiInferenceProvider {
  readonly mode = 'on_device' as const;

  async isRuntimeAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }

    try {
      initExecutorchRuntime();
      const { isAvailable } = await import('react-native-executorch');
      return isAvailable;
    } catch (error) {
      logError('ExecuTorch runtime unavailable:', error);
      return false;
    }
  }

  isLoaded(): boolean {
    return llmInstance !== null && loadedModelId === getSelectedModelId();
  }

  async load(
    options: {
      allowCellular?: boolean;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<void> {
    const { allowCellular = false, onProgress } = options;
    const modelId = getSelectedModelId();

    if (this.isLoaded()) {
      return;
    }

    if (loadPromise) {
      return loadPromise;
    }

    loadPromise = this.loadInternal(modelId, allowCellular, onProgress).finally(
      () => {
        loadPromise = null;
      }
    );

    return loadPromise;
  }

  private async loadInternal(
    modelId: AiOnDeviceModelId,
    allowCellular: boolean,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    if (Platform.OS === 'web') {
      throw new Error('On-device AI is not supported on web.');
    }

    const runtimeAvailable = await this.isRuntimeAvailable();
    if (!runtimeAvailable) {
      throw new Error(
        'ExecuTorch is not available on this device. Use a development build on iOS 17+ or Android 13+.'
      );
    }

    if (!allowCellular) {
      const onWifi = await isWifiConnected();
      if (!onWifi) {
        throw new Error(
          'Model download requires Wi-Fi. Enable cellular download in Settings or connect to Wi-Fi.'
        );
      }
    }

    if (llmInstance && loadedModelId !== modelId) {
      await this.unload();
    }

    initExecutorchRuntime();

    const { LLMModule } = await import('react-native-executorch');
    const modelConfig = getModelCatalogEntry(modelId).resolve();

    try {
      llmInstance = await LLMModule.fromModelName(
        modelConfig,
        (progress) => onProgress?.(progress)
      );
      loadedModelId = modelId;

      useSettingsStore.getState().updateAiDownloadedModelId(modelId);
    } catch (error) {
      llmInstance = null;
      loadedModelId = null;
      throw error;
    }
  }

  async unload(): Promise<void> {
    if (llmInstance) {
      try {
        llmInstance.delete();
      } catch (error) {
        logError('Failed to unload ExecuTorch model:', error);
      }
    }

    llmInstance = null;
    loadedModelId = null;
  }

  async complete(
    messages: AiCompletionMessage[],
    options: AiCompletionOptions = {}
  ): Promise<string | null> {
    if (!this.isLoaded()) {
      const { settings } = useSettingsStore.getState();
      await this.load({ allowCellular: settings.aiUseCellularDownload });
    }

    if (!llmInstance) {
      return null;
    }

    llmInstance.configure({
      generationConfig: {
        temperature: options.temperature ?? 0.1,
      },
      chatConfig: {
        systemPrompt: '',
        initialMessageHistory: [],
      },
    });

    const result = await llmInstance.generate(messages);
    const trimmed = result.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}

export const onDeviceExecutorchProvider = new OnDeviceExecutorchProvider();

export async function deleteOnDeviceModelResources(
  modelId: AiOnDeviceModelId
): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  initExecutorchRuntime();

  const { ExpoResourceFetcher } = await import(
    'react-native-executorch-expo-resource-fetcher'
  );
  const modelConfig = getModelCatalogEntry(modelId).resolve();

  await ExpoResourceFetcher.deleteResources(
    modelConfig.modelSource,
    modelConfig.tokenizerSource,
    modelConfig.tokenizerConfigSource
  );
}
