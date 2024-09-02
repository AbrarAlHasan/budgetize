import {
  Image,
  StyleSheet,
  Platform,
  Text,
  Pressable,
  View,
  ScrollView,
  useColorScheme,
} from "react-native";

import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import {
  SafeAreaInsetsContext,
  SafeAreaView,
} from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import DateRangePicker from "@/components/DateRangePicker";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import {
  setDateRange,
  setIsDateRangeVisible,
} from "@/redux/reducers/slice/homeSlice";
import { getCurrentWeekRange } from "@/utils/DateCalculator";
import WeeklySpends from "@/components/HomeScreen/WeeklySpends";
import MonthlySpends from "@/components/HomeScreen/MonthlySpends";
import { Colors } from "@/constants/Colors";

export default function HomeScreen() {
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = useState(false);

  const colorScheme = useColorScheme();

  const homeSlice = useSelector((state: RootState) => state.HomeSlice);

  const dispatch = useDispatch();

  const onCancel = () => {
    dispatch(setIsDateRangeVisible(false));
  };
  const onConfirm = (data: any) => {
    dispatch(setDateRange(getCurrentWeekRange(data?.startDateString)));
    dispatch(setIsDateRangeVisible(false));
  };

  useEffect(() => {
    console.log("HELLO");
  }, [homeSlice.dateRange.fromDate, homeSlice.dateRange.toDate]);
  return (
    <>
      <ScrollView
        style={{
          backgroundColor: Colors[colorScheme ?? "light"].background,
        }}
      >
        <View style={{ paddingHorizontal: 10 }}>
          <WeeklySpends />
          <MonthlySpends />
        </View>
      </ScrollView>
      <DateRangePicker
        isVisible={homeSlice.isDateRangeVisible}
        onCancel={onCancel}
        mode="range"
        onConfirm={onConfirm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
