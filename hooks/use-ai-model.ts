import { useCallback, useEffect, useState } from 'react';

import { getModelSizeLabel } from '@/services/ai/model-catalog';
import { isAiModelReady, releaseAiContext } from '@/services/ai/ai-service';
import {
  deleteModel,
  downloadModel,
  isModelDownloaded,
  type ModelDownloadProgress,
} from '@/services/ai/model-manager';
import { onDeviceExecutorchProvider } from '@/services/ai/providers/on-device-provider';
import { useSettingsStore } from '@/store/settings-store';

export function useAiModel() {
  const { settings } = useSettingsStore();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<ModelDownloadProgress | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const modelSizeLabel = getModelSizeLabel(settings.aiOnDeviceModelId);
  const isCloudMode = settings.aiExecutionMode === 'cloud';

  const refreshDownloadStatus = useCallback(async () => {
    setIsChecking(true);
    setInitError(null);

    try {
      if (isCloudMode) {
        setIsDownloaded(false);
        setIsReady(false);
        return;
      }

      const downloaded = await isModelDownloaded();
      setIsDownloaded(downloaded);

      const loaded = onDeviceExecutorchProvider.isLoaded();
      if (loaded) {
        setIsReady(true);
        return;
      }

      if (!downloaded) {
        setIsReady(false);
        return;
      }

      const ready = await isAiModelReady();
      setIsReady(ready);

      if (!ready) {
        setInitError(
          'The model file is on your device but could not be loaded. Try downloading again, or restart the app.'
        );
      }
    } finally {
      setIsChecking(false);
    }
  }, [isCloudMode, settings.aiOnDeviceModelId]);

  useEffect(() => {
    refreshDownloadStatus();
  }, [refreshDownloadStatus]);

  const startDownload = useCallback(async () => {
    if (isCloudMode) {
      const message = 'Cloud AI is not available yet. Switch to on-device AI in Settings.';
      setError(message);
      throw new Error(message);
    }

    setError(null);
    setInitError(null);
    setIsDownloading(true);
    setDownloadProgress(null);

    try {
      await downloadModel({
        allowCellular: settings.aiUseCellularDownload,
        onProgress: setDownloadProgress,
      });

      const ready = onDeviceExecutorchProvider.isLoaded();
      setIsDownloaded(true);
      setIsReady(ready);

      if (!ready) {
        setInitError(
          'Download finished but the model could not start. Restart the app or try downloading again.'
        );
      }
    } catch (downloadError) {
      const message =
        downloadError instanceof Error
          ? downloadError.message
          : 'Failed to download AI model.';
      setError(message);
      setIsReady(false);
      throw downloadError;
    } finally {
      setIsDownloading(false);
    }
  }, [isCloudMode, settings.aiUseCellularDownload, settings.aiOnDeviceModelId]);

  const removeModel = useCallback(async () => {
    await deleteModel();
    await releaseAiContext();
    setIsDownloaded(false);
    setIsReady(false);
    setInitError(null);
  }, []);

  return {
    isDownloaded,
    isReady,
    isChecking,
    isDownloading,
    downloadProgress,
    error,
    initError,
    modelSizeLabel,
    isCloudMode,
    startDownload,
    removeModel,
    refreshDownloadStatus,
  };
}
