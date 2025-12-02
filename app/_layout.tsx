import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "../global.css";

import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";
import { queryClient } from "@/hooks/use-query-client";
import { useInAppUpdates } from "@/hooks/use-in-app-updates";
import { onboardingStorage } from "@/storage/onboarding";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { colorScheme, useColorScheme } from "nativewind";
import { PostHogProvider } from "posthog-react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { logError } from "@/utils/logger";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const nativeWindColorScheme = useColorScheme();
  const { loadSettings, settings } = useSettingsStore();
  const [isReady, setIsReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [themeSynced, setThemeSynced] = useState(false);

  // Initialize in-app updates (only checks after app is ready and onboarding complete)
  useInAppUpdates({
    autoCheck: isReady && !showOnboarding, // Only check after initialization and onboarding
    daysBeforePrompt: 2,
    immediateUpdate: false,
  });

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize auth
        const { initialize: initializeAuth } = useAuthStore.getState();
        await initializeAuth();

        // Load settings first
        await loadSettings();

        // Wait a tick to ensure settings state is updated
        await new Promise((resolve) => setTimeout(resolve, 0));

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

        // Wait a bit to ensure NativeWind has processed the colorScheme change
        await new Promise((resolve) => setTimeout(resolve, 100));

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

  // Show onboarding if not completed
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
      <PostHogProvider
        apiKey={process.env.EXPO_PUBLIC_POST_HOG_API_KEY!}
        options={{
          host: process.env.EXPO_PUBLIC_POST_HOG_HOST!,
        }}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
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
          </QueryClientProvider>
        </GestureHandlerRootView>
      </PostHogProvider>
    </View>
  );
}
