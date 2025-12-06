import { Alert } from "@/components/ui/alert";
import { logError, logInfo } from "@/utils/logger";
import * as ExpoInAppUpdates from "expo-in-app-updates";
import { useCallback, useEffect } from "react";
import { Platform } from "react-native";

interface UpdateCheckResult {
  updateAvailable: boolean;
  daysSinceRelease?: string |number | null;
  releaseDate?: Date;
}

/**
 * Helper function to calculate days between two dates
 */
function getDiffInDays(date: Date): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Hook for managing in-app updates
 *
 * Automatically checks for updates on app launch and provides
 * methods for manual update checks.
 *
 * @param options Configuration options
 * @param options.autoCheck - Whether to automatically check for updates on mount (default: true)
 * @param options.daysBeforePrompt - Number of days to wait before prompting user (default: 2)
 * @param options.immediateUpdate - Use immediate update flow on Android (default: false)
 */
export function useInAppUpdates(options?: {
  autoCheck?: boolean;
  daysBeforePrompt?: number;
  immediateUpdate?: boolean;
}) {
  const {
    autoCheck = true,
    daysBeforePrompt = 0, // Show updates immediately by default
    immediateUpdate = false,
  } = options || {};

  /**
   * Check for available updates
   */
  const checkForUpdate =
    useCallback(async (): Promise<UpdateCheckResult | null> => {
      // Skip in development or on web
      if (__DEV__ || Platform.OS === "web") {
        return null;
      }

      try {
        const result = await ExpoInAppUpdates.checkForUpdate();
        logInfo(
          "Update check result:",
          JSON.stringify({
            updateAvailable: result.updateAvailable,
            daysSinceRelease: result.daysSinceRelease,
            releaseDate: result.releaseDate,
          })
        );
        return {
          updateAvailable: result.updateAvailable,
          daysSinceRelease: result.daysSinceRelease,
          releaseDate: result.releaseDate
            ? new Date(result.releaseDate)
            : undefined,
        };
      } catch (error) {
        logError("Failed to check for updates:", error);
        return null;
      }
    }, []);

  /**
   * Start the update process
   */
  const startUpdate = useCallback(
    async (useImmediate?: boolean): Promise<void> => {
      // Skip in development or on web
      if (__DEV__ || Platform.OS === "web") {
        return;
      }

      try {
        const shouldUseImmediate = useImmediate ?? immediateUpdate;
        await ExpoInAppUpdates.startUpdate(shouldUseImmediate);
      } catch (error) {
        logError("Failed to start update:", error);
        throw error;
      }
    },
    [immediateUpdate]
  );

  /**
   * Check for updates and prompt user if available
   * @param showNoUpdateMessage - Whether to show a message if no update is available (default: false)
   */
  const checkAndPromptUpdate = useCallback(
    async (showNoUpdateMessage: boolean = false): Promise<void> => {
      // Skip in development or on web
      if (__DEV__ || Platform.OS === "web") {
        if (showNoUpdateMessage) {
          Alert.alert(
            "Not Available",
            "Update checks are not available in development mode or on web."
          );
        }
        return;
      }

      try {
        const result = await checkForUpdate();
        if (!result || !result.updateAvailable) {
          if (showNoUpdateMessage) {
            Alert.alert(
              "Up to Date",
              "You are using the latest version of the app."
            );
          }
          return;
        }

        // Update is available - determine if we should use immediate or flexible update flow
        // Only use immediate update if daysBeforePrompt > 0 and update has been available for that many days
        const shouldUseImmediate =
          Platform.OS === "android" &&
          daysBeforePrompt > 0 &&
          ((result.daysSinceRelease &&
            Number(result.daysSinceRelease) >= daysBeforePrompt) ||
            (result.releaseDate &&
              getDiffInDays(result.releaseDate) >= daysBeforePrompt));

        // On Android, if update has been available for more than specified days, use immediate update
        if (shouldUseImmediate) {
          try {
            await startUpdate(true);
            return;
          } catch (updateErr) {
            logError("Failed to start immediate update:", updateErr);
            // Fall through to show flexible update prompt
          }
        }

        // Show flexible update prompt (always show if update is available)
        Alert.alert(
          "Update Available",
          "A new version of the app is available with improvements and bug fixes. Would you like to update now?",
          [
            {
              text: "Update",
              onPress: async () => {
                try {
                  // Use flexible update flow (non-blocking) for Android
                  await startUpdate(false);
                } catch (updateErr) {
                  logError("Failed to start update:", updateErr);
                  Alert.alert(
                    "Update Failed",
                    "Could not start the update. Please try updating from the App Store or Play Store."
                  );
                }
              },
            },
            { text: "Later", style: "cancel" },
          ]
        );
      } catch (error) {
        logError("Update check failed:", error);
        if (showNoUpdateMessage) {
          Alert.alert(
            "Update Check Failed",
            "Could not check for updates. Please try again later."
          );
        }
      }
    },
    [checkForUpdate, startUpdate, daysBeforePrompt]
  );

  // Auto-check for updates on mount
  useEffect(() => {
    if (autoCheck) {
      checkAndPromptUpdate();
    }
  }, [autoCheck, checkAndPromptUpdate]);

  return {
    checkForUpdate,
    startUpdate,
    checkAndPromptUpdate,
  };
}
