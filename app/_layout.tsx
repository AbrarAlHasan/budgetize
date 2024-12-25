// app/_layout.tsx
import { RootState, store } from "@/redux/store";
import { Stack, Slot, SplashScreen } from "expo-router";
import { useState, useEffect } from "react";
import {
  View,
  ActivityIndicator,
  useColorScheme,
  Platform,
  AppRegistry,
  Appearance,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Provider, useSelector } from "react-redux";
import { Toast, ToastProvider } from "react-native-toast-notifications";
import BackgroundScheduler from "@/components/BackgroundScheduler";
import { Colors } from "@/constants/Colors";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from "expo-linking";
import { LinkingOptions } from "@react-navigation/native";
import LoadingWrapper from "@/components/LoadingWrapper";

const prefix = Linking.createURL("/");

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <ToastProvider>
          <LoadingWrapper>
            <SafeAreaProvider>
              <MoneyManager />
            </SafeAreaProvider>
          </LoadingWrapper>
          <BackgroundScheduler />
        </ToastProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const MoneyManager = () => {
  const isAuthenticated = useSelector(
    (state: RootState) => state.AuthSlice.isAuthenticated
  );

  const colorScheme = useColorScheme();

  useEffect(() => {
    Appearance.setColorScheme("dark");
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        navigationBarColor: Colors[colorScheme ?? "light"].background,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="updateApp"
        options={{ headerShown: false, animation: "fade" }}
      />
      {!isAuthenticated ? (
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      )}
      <Stack.Screen name="(stack)" options={{ headerShown: false }} />
    </Stack>
  );
};
