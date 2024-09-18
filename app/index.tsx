// app/startup.tsx
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { RootState, store } from "@/redux/store";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native";
import { setCheckingAuthentication } from "@/redux/reducers/slice/authSlice";
import { checkActiveSessionAction } from "@/api/authentication.action";
import { setDateRange } from "@/redux/reducers/slice/homeSlice";
import { getCurrentWeekRange } from "@/utils/DateCalculator";

export default function Startup() {
  const router = useRouter();

  const authSlice = useSelector((state: RootState) => state.AuthSlice);
  const dispatch = useDispatch();

  const fetchInitialData = async () => {
    try {
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
    fetchInitialData();
  }, []);

  return (
    <>
      <SafeAreaView>
        <Text>Startup Container</Text>
      </SafeAreaView>
    </>
  ); // Render splash screen or loader if needed
}
