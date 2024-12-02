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
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'http://f9e16d12337223086176f04bef789846@sentry.suzukibusinesscloud-dev.com/12',

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // enableSpotlight: __DEV__,
});



const prefix = Linking.createURL("/");

export default function Layout() {
  // const [isLoading, setIsLoading] = useState(true);

  // if (isLoading) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
  //       <ActivityIndicator size="large" />
  //     </View>
  //   );
  // }

  const parseSupabaseUrl = (url: string) => {
    let parsedUrl = url;
    if (url.includes("#")) {
      parsedUrl = url.replace("#", "?");
    }

    return parsedUrl;
  };

  const getInitialURL = async () => {
    const url = await Linking.getInitialURL();

    if (url !== null) {
      return parseSupabaseUrl(url);
    }

    return url;
  };

  const subscribe = (listener: (url: string) => void) => {
    const onReceiveURL = ({ url }: { url: string }) => {
      console.log("SUBSCRIBE", url);
      listener(url);
    };
    const subscription = Linking.addEventListener("url", onReceiveURL);

    return () => {
      subscription.remove();
    };
  };

  const linking: LinkingOptions<any> = {
    prefixes: [prefix],
    config: {
      screens: {
        ResetPasswordScreen: "/ResetPassword",
      },
    },
    getInitialURL,
    subscribe,
  };

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
