// app/startup.tsx
import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { RootState, store } from "@/redux/store";
import { SafeAreaView } from "react-native-safe-area-context";
import { Platform, Text, useColorScheme } from "react-native";
import { setCheckingAuthentication } from "@/redux/reducers/slice/authSlice";
import { checkActiveSessionAction } from "@/api/authentication.action";
import { setDateRange } from "@/redux/reducers/slice/homeSlice";
import { getCurrentWeekRange } from "@/utils/DateCalculator";

import { textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";
import { disableLoading } from "@/redux/reducers/slice/globalSlice";
import flagsmith from "react-native-flagsmith";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import LottieView from "lottie-react-native";
import { nativeApplicationVersion } from "expo-application";

export default function Startup() {
  const router = useRouter();

  const authSlice = useSelector((state: RootState) => state.AuthSlice);
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();

  function compareVersions(version1: string, version2: string) {
    const v1 = version1.split(".").map(Number);
    const v2 = version2.split(".").map(Number);

    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const num1 = v1[i] || 0;
      const num2 = v2[i] || 0;

      if (num1 > num2) {
        return true;
      } else if (num1 < num2) {
        return false;
      }
    }

    return false; // Both versions are equal
  }

  const initializeFlagSmith = async () => {
    const response = await flagsmith.init({
      environmentID: "kFexAvriRsjNik3WgEavvA",
      cacheFlags: true,
      AsyncStorage: AsyncStorage,
      // onChange: (change) => {
      //   console.log("ON CHANGE TRIGGERED", change);
      // },
      // onError: (err) => {
      //   console.log("ON ERROR", err);
      // },
    });
    // console.log("FLAG INIT", response);
  };

  const fetchInitialData = async () => {
    try {
      await initializeFlagSmith();
      const parsedVersion = JSON.parse(flagsmith.getValue("version"));
      let version;

      if (Platform.OS === "android") {
        version = parsedVersion?.android;
      }
      if (Platform.OS === "ios") {
        version = parsedVersion?.ios;
      }

      if (version && nativeApplicationVersion) {
        const value = compareVersions(
          version?.version,
          nativeApplicationVersion
        );
        if (value) {
          router.replace({ pathname: "/updateApp", params: version });
          return;
        }
      }
      const response = await checkActiveSessionAction();
      dispatch(setDateRange(getCurrentWeekRange()));

      if (response && authSlice?.userDetails !== null) {
        router.replace("/(tabs)/");
      } else {
        router.replace("/(auth)/");
      }
    } catch (error) {}
  };

  useEffect(() => {
    dispatch(disableLoading());
    dispatch(
      setCheckingAuthentication({
        isAuthenticated: true,
        checkingAuthentication: true,
      })
    );
    fetchInitialData();
  }, []);

  return (
    <>
      <SafeAreaView
        style={{ alignItems: "center", justifyContent: "center", flex: 1 }}
      >
        {Platform.OS === "web" ? (
          <DotLottieReact
            autoplay={true}
            style={{
              width: 300,
              height: 300,
            }}
            src={"../assets/gifs/AuthLoading.json"}
            loop={true}
          />
        ) : (
          <LottieView
            autoPlay
            style={{
              width: 300,
              height: 300,
            }}
            source={require("@/assets/gifs/AuthLoading.json")}
          />
        )}

        <Text
          style={[
            textStyles.bolder,
            textStyles.md,
            { color: Colors[colorScheme ?? "light"].primary },
          ]}
        >
          Fetching Budgets
        </Text>
      </SafeAreaView>
    </>
  ); // Render splash screen or loader if needed
}
