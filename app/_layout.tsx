// app/_layout.tsx
import { RootState, store } from "@/redux/store";
import { Stack, Slot } from "expo-router";
import { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Provider, useSelector } from "react-redux";
import { ToastProvider } from "react-native-toast-notifications";

export default function Layout() {
  // const [isLoading, setIsLoading] = useState(true);

  // if (isLoading) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
  //       <ActivityIndicator size="large" />
  //     </View>
  //   );
  // }

  return (
    <Provider store={store}>
      <ToastProvider>
        <SafeAreaProvider>
          <MoneyManager />
        </SafeAreaProvider>
      </ToastProvider>
    </Provider>
  );
}

const MoneyManager = () => {
  const isAuthenticated = useSelector(
    (state: RootState) => state.AuthSlice.isAuthenticated
  );

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {!isAuthenticated ? (
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      )}
      <Stack.Screen
        name="(stack)"
        options={{ headerShown: false, presentation: "formSheet" }}
      />
    </Stack>
  );
};
