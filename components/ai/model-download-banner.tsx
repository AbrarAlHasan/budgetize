import { AiGlowBorder, AiGradientCta } from '@/components/ai/ai-glow';
import { AI_GRADIENT } from '@/constants/ai-theme';
import type { useAiModel } from '@/hooks/use-ai-model';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Text, View } from 'react-native';

type AiModelState = ReturnType<typeof useAiModel>;

interface ModelDownloadBannerProps {
  model: AiModelState;
}

export function ModelDownloadBanner({ model }: ModelDownloadBannerProps) {
  const {
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
    refreshDownloadStatus,
  } = model;

  if (isCloudMode) {
    return (
      <AiGlowBorder borderRadius={16} animated={false} innerClassName="bg-white dark:bg-gray-950" style={{ marginBottom: 12 }}>
        <View className="p-4">
          <Text className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            Cloud AI coming soon
          </Text>
          <Text className="text-xs text-gray-600 dark:text-gray-400 leading-5">
            Cloud models are not available yet. Switch to on-device AI in Settings to use Ask Budgetize.
          </Text>
        </View>
      </AiGlowBorder>
    );
  }

  if (isChecking) {
    return (
      <AiGlowBorder borderRadius={16} animated={false} innerClassName="bg-white dark:bg-gray-950" style={{ marginBottom: 12 }}>
        <View className="p-4 items-center">
          <ActivityIndicator size="small" color="#7C4DFF" />
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Checking AI model…
          </Text>
        </View>
      </AiGlowBorder>
    );
  }

  if (isReady) {
    return null;
  }

  const handleDownload = async () => {
    try {
      await startDownload();
      await refreshDownloadStatus();
    } catch {
      // Error state handled by hook
    }
  };

  const title = isDownloaded ? 'Finish setting up AI' : 'AI model required';
  const description = isDownloaded
    ? 'The on-device model must load before you can chat. Tap below to retry, or restart the app.'
    : `Download the on-device AI model (${modelSizeLabel}) to use Ask Budgetize, smart insights, and auto-categorization. Your data never leaves your phone.`;

  const statusError = !isDownloading ? (error ?? initError) : null;

  return (
    <AiGlowBorder
      borderRadius={16}
      animated={false}
      innerClassName="bg-violet-50/80 dark:bg-violet-950/30"
      style={{ marginBottom: 12 }}
    >
      <View className="p-4">
        <Text className="text-sm font-medium text-gray-900 dark:text-white mb-1">{title}</Text>
        <Text className="text-xs text-gray-600 dark:text-gray-400 mb-3 leading-5">
          {description}
        </Text>

        {isDownloading && downloadProgress && (
          <View className="mb-3">
            <View className="h-1.5 rounded-full bg-violet-100 dark:bg-violet-900/50 overflow-hidden">
              <LinearGradient
                colors={[...AI_GRADIENT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: '100%', width: `${downloadProgress.progress}%` }}
              />
            </View>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Downloading… {Math.round(downloadProgress.progress)}%
            </Text>
          </View>
        )}

        {statusError && (
          <Text className="text-xs text-red-600 dark:text-red-400 mb-2">
            {statusError}
          </Text>
        )}

        <AiGradientCta
          onPress={handleDownload}
          disabled={isDownloading}
          loading={isDownloading}
          label={isDownloaded ? 'Retry download' : 'Download AI Model'}
        />
      </View>
    </AiGlowBorder>
  );
}
