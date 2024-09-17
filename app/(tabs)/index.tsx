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
import { useCallback, useEffect, useState } from "react";
import DateRangePicker from "@/components/DateRangePicker";
import { useDispatch, useSelector } from "react-redux";
import { RootState, store } from "@/redux/store";
import {
  setDateRange,
  setIsDateRangeVisible,
  setMonthlyCategories,
  setTotalMonthlyBudget,
  setTotalMonthlyBudgetLeft,
  setTotalWeeklyBudget,
  setTotalWeeklyBudgetLeft,
  setWeeklyCategories,
} from "@/redux/reducers/slice/homeSlice";
import {
  formatDateTimeTimezone,
  getCurrentMonthRange,
  getCurrentWeekRange,
} from "@/utils/DateCalculator";
import WeeklySpends from "@/components/HomeScreen/WeeklySpends";
import MonthlySpends from "@/components/HomeScreen/MonthlySpends";
import { Colors } from "@/constants/Colors";
import { getCurrentMonthBudget, getCurrentWeekBudget } from "@/api/home.action";
import { supabase } from "@/lib/supabase";
import { ICategory, ITransaction } from "@/types/HomeScreenTypes";
import FloatingButton from "@/components/FloatingButton";
import { router, useFocusEffect } from "expo-router";
import DottedButton from "@/components/DottedButton";

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

  // useEffect(() => {
  //   fetchData();
  // }, [homeSlice.dateRange.fromDate]);

  // useFocusEffect(
  //   useCallback(() => {
  //     fetchData();
  //   }, [homeSlice.dateRange.fromDate])
  // );

  // const fetchData = async () => {
  //   try {
  //     const [weeklyResponse, monthlyResponse] = await Promise.all([
  //       getCurrentWeekBudget({
  //         fromDate: homeSlice.dateRange.fromDate,
  //         toDate: homeSlice.dateRange.toDate,
  //       }),
  //       getCurrentMonthBudget(
  //         getCurrentMonthRange(homeSlice.dateRange.fromDate)
  //       ),
  //     ]);
  //     let weeklySpentAmount = 0;
  //     let monthlySpentAmount = 0;
  //     dispatch(
  //       setTotalWeeklyBudget(
  //         weeklyResponse?.response?.reduce((acc, currentValue: ICategory) => {
  //           const spentAmount = currentValue?.transactions?.reduce(
  //             (accu: number, curr: ITransaction) => accu + curr.amount,
  //             0
  //           );
  //           weeklySpentAmount += spentAmount;
  //           return acc + currentValue.amount_allocated;
  //         }, 0)
  //       )
  //     );
  //     dispatch(setWeeklyCategories(weeklyResponse?.response));

  //     dispatch(
  //       setTotalMonthlyBudget(
  //         monthlyResponse?.response?.reduce((acc, currentValue: ICategory) => {
  //           const spentAmount = currentValue?.transactions?.reduce(
  //             (accu: number, curr: ITransaction) => accu + curr.amount,
  //             0
  //           );
  //           monthlySpentAmount += spentAmount;
  //           return acc + currentValue.amount_allocated;
  //         }, 0)
  //       )
  //     );
  //     dispatch(setMonthlyCategories(monthlyResponse?.response));
  //     dispatch(setTotalWeeklyBudgetLeft(weeklySpentAmount));
  //     dispatch(setTotalMonthlyBudgetLeft(monthlySpentAmount));
  //   } catch (error) {
  //   } finally {
  //   }
  // };

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
        <DottedButton
          label="Add New Category"
          onPress={() => {
            router.navigate("/(stack)/addCategory");
          }}
        />
      </ScrollView>
      <DateRangePicker
        isVisible={homeSlice.isDateRangeVisible}
        onCancel={onCancel}
        mode="range"
        onConfirm={onConfirm}
      />
      <FloatingButton
        onPress={() => {
          router.navigate("/(stack)/addTransaction");
        }}
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
