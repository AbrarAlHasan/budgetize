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

import AsyncStorage from "@react-native-async-storage/async-storage";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import LottieView from "lottie-react-native";
import { nativeApplicationVersion } from "expo-application";
import { getVersionDetails } from "@/utils/VersionValidator";

export default function Startup() {
  const router = useRouter();

  const authSlice = useSelector((state: RootState) => state.AuthSlice);
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();

  const fetchInitialData = async () => {
    try {
      const isUpdatedVersion = await getVersionDetails();

      if (!isUpdatedVersion) return;
      const response = await checkActiveSessionAction();
      dispatch(setDateRange(getCurrentWeekRange()));

      if (response && authSlice?.userDetails !== null) {
        router.replace("/(tabs)/");
      } else {
        router.replace("/(auth)/");
      }
    } catch (error) {
      console.log(error);
    }
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
