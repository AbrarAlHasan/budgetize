import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useNavigationContainerRef } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "../global.css";
// Registers the cloud backup background task handler (global scope).
import "@/tasks/cloud-backup-background-task";

import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";
import { LockScreen } from "@/components/security/lock-screen";
import { SplashOverlay } from "@/components/security/splash-overlay";
import { AlertProvider } from "@/components/ui/alert";
import { UpdateScreen } from "@/components/update-screen";
import { useAutoCloudBackup } from "@/hooks/use-auto-cloud-backup";
import { useInAppUpdates } from "@/hooks/use-in-app-updates";
import { queryClient } from "@/hooks/use-query-client";
import { useWidgetSync } from "@/hooks/use-widget-sync";
import { trackInstallation } from "@/services/installation-tracker";
import { onboardingStorage } from "@/storage/onboarding";
import { initExecutorchRuntime } from "@/services/ai/executorch-init";
import { useAuthStore } from "@/store/auth-store";
import { useSecurityStore } from "@/store/security-store";
import { useSettingsStore } from "@/store/settings-store";
import { logError } from "@/utils/logger";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as Sentry from "@sentry/react-native";
import { isRunningInExpoGo } from "expo";
import { router } from "expo-router";
import { colorScheme, useColorScheme } from "nativewind";

import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, AppState, AppStateStatus, Platform, View } from "react-native";

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

Sentry.init({
  dsn: "https://60311b20b7888ddc2048ae7881323d91@o4505251515465728.ingest.us.sentry.io/4510549092401152",

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration()],
  enableNativeFramesTracking: !isRunningInExpoGo(),
  tracesSampleRate: 1.0,

  debug: __DEV__,
});

export const unstable_settings = {
  anchor: "(tabs)",
};

export default Sentry.wrap(function RootLayout() {
  const nativeWindColorScheme = useColorScheme();
  const { loadSettings, settings } = useSettingsStore();
  const { isLockEnabled, isAuthenticated, setAuthenticated } =
    useSecurityStore();
  const [isReady, setIsReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [themeSynced, setThemeSynced] = useState(false);
  const [showUpdateScreen, setShowUpdateScreen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasDismissedUpdate, setHasDismissedUpdate] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(() => {
    try {
      return AppState.currentState || "active";
    } catch {
      return "active";
    }
  });

  const ref = useNavigationContainerRef();

  // Sync widget data (only when app is ready and not showing onboarding)
  useWidgetSync();

  // Daily automatic cloud backup (background + foreground catch-up)
  useAutoCloudBackup();

  // Handle update available callback
  const handleUpdateAvailable = useCallback(() => {
    // Only show update screen if user hasn't dismissed it in this session
    if (!hasDismissedUpdate) {
      setShowUpdateScreen(true);
    }
  }, [hasDismissedUpdate]);

  // Initialize in-app updates (only checks after app is ready and onboarding complete)
  // Don't auto-check if update screen is shown or if user has dismissed it
  const { startUpdate } = useInAppUpdates({
    autoCheck:
      isReady && !showOnboarding && !showUpdateScreen && !hasDismissedUpdate,
    daysBeforePrompt: 0, // Show updates immediately when available
    immediateUpdate: false,
    onUpdateAvailable: handleUpdateAvailable,
  });

  // Handle update button press
  const handleUpdate = useCallback(async () => {
    try {
      setIsUpdating(true);
      await startUpdate(false);
      // Note: startUpdate will handle the update flow
    } catch (error) {
      logError("Failed to start update:", error);
      setIsUpdating(false);
    }
  }, [startUpdate]);

  // Handle cancel button press
  const handleCancelUpdate = useCallback(() => {
    setShowUpdateScreen(false);
    setIsUpdating(false);
    setHasDismissedUpdate(true); // Mark as dismissed to prevent re-showing
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      initExecutorchRuntime();
    }
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize auth (just sets up listener, doesn't check session)
        const { initialize: initializeAuth, checkSession } =
          useAuthStore.getState();
        initializeAuth();

        // Check session only if network is available (runs in background)
        checkSession(true).catch((error) => {
          logError("Session check error (non-blocking):", error);
        });

        // Track installation (non-blocking, runs in background)
        trackInstallation().catch((error) => {
          logError("Installation tracking error (non-blocking):", error);
        });

        // Load settings first
        await loadSettings();

        // Get the latest settings after load
        const { settings: loadedSettings } = useSettingsStore.getState();

        // Sync stored theme with NativeWind BEFORE rendering
        if (loadedSettings.theme && loadedSettings.theme !== "auto") {
          colorScheme.set(loadedSettings.theme);
        } else {
          // Reset to system preference
          colorScheme.set("system");
        }

        // Mark theme as synced
        setThemeSynced(true);

        // Then check onboarding
        const completed = onboardingStorage.isCompleted();
        setShowOnboarding(!completed);
      } catch (error) {
        logError("Error initializing app:", error);
        setThemeSynced(true); // Still mark as synced even on error
      } finally {
        // Mark as ready regardless of errors
        setIsReady(true);
      }
    };

    initializeApp();

    // Cleanup deep link listener
    return () => {
      // Note: Linking.removeEventListener is deprecated, but we keep the subscription
      // The subscription will be cleaned up when component unmounts
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync theme when settings change
  useEffect(() => {
    if (settings.theme && settings.theme !== "auto") {
      colorScheme.set(settings.theme);
    } else {
      colorScheme.set("system");
    }
  }, [settings.theme]);

  // Handle app state changes - reset authentication when app goes to background
  useEffect(() => {
    // Initialize app state safely
    try {
      const currentState = AppState.currentState;
      if (currentState) {
        setAppState(currentState);
      }
    } catch (error) {
      logError("Error getting initial app state:", error);
    }

    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        try {
          setAppState(nextAppState);

          if (isLockEnabled) {
            // Only reset authentication when app goes to background (not inactive)
            // Inactive state shows splash overlay, background state requires re-authentication
            if (nextAppState === "background") {
              setAuthenticated(false);
            }
          }
        } catch (error) {
          logError("Error handling app state change:", error);
        }
      }
    );

    return () => {
      try {
        subscription.remove();
      } catch (error) {
        logError("Error removing app state listener:", error);
      }
    };
  }, [isLockEnabled, setAuthenticated]);

  useEffect(() => {
    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);

  const handleOnboardingComplete = (navigateToCloudBackup?: boolean) => {
    onboardingStorage.setCompleted();
    setShowOnboarding(false);

    // Navigate to settings with focus on account section if cloud backup was selected
    if (navigateToCloudBackup) {
      // Use setTimeout to ensure navigation happens after onboarding is dismissed
      setTimeout(() => {
        router.push({
          pathname: "/(tabs)/settings",
          params: { focusAccount: "true" },
        });
      }, 100);
    }
  };

  // Show loading spinner while initializing or syncing theme
  if (!isReady || !themeSynced) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Show lock screen if security is enabled and user is not authenticated
  // This should be shown BEFORE update screen and onboarding
  // Only show lock screen when app is active (not when inactive/background - splash overlay handles that)
  // Also ensure app is ready to prevent crashes during initialization
  if (
    isReady &&
    themeSynced &&
    isLockEnabled &&
    !isAuthenticated &&
    appState === "active"
  ) {
    return (
      <LockScreen
        onUnlock={() => {
          // Authentication successful, continue with app flow
          setAuthenticated(true);
        }}
      />
    );
  }

  // Show update screen if update is available (only after authentication)
  if (showUpdateScreen) {
    return (
      <UpdateScreen
        onUpdate={handleUpdate}
        onCancel={handleCancelUpdate}
        isUpdating={isUpdating}
      />
    );
  }

  // Show onboarding if not completed (only after authentication)
  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // Determine theme: use stored settings if available, otherwise use NativeWind's colorScheme
  const effectiveTheme =
    settings.theme && settings.theme !== "auto"
      ? settings.theme
      : nativeWindColorScheme.colorScheme === "dark"
      ? "dark"
      : "light";

  const normalizedColorScheme = (
    effectiveTheme === "dark" ? "dark" : "light"
  ) as "light" | "dark";

  return (
    <View
      style={{ flex: 1 }}
      className={normalizedColorScheme === "dark" ? "dark" : ""}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <AlertProvider>
            <BottomSheetModalProvider>
              <ThemeProvider
                value={
                  normalizedColorScheme === "dark" ? DarkTheme : DefaultTheme
                }
              >
                <Stack>
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="modal"
                    options={{ presentation: "modal", title: "Modal" }}
                  />
                </Stack>
                <StatusBar
                  style={normalizedColorScheme === "dark" ? "light" : "dark"}
                />
              </ThemeProvider>
            </BottomSheetModalProvider>
          </AlertProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
      <SplashOverlay />
    </View>
  );
});
