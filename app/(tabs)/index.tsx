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
import React, { useCallback, useEffect, useState } from "react";
import DateRangePicker from "@/components/DateRangePicker";
import { useDispatch, useSelector } from "react-redux";
import { RootState, store } from "@/redux/store";
import {
  setDateRange,
  setIsDateRangeVisible,
} from "@/redux/reducers/slice/homeSlice";
import { getCurrentWeekRange } from "@/utils/DateCalculator";
import WeeklySpends from "@/components/HomeScreen/WeeklySpends";
import MonthlySpends from "@/components/HomeScreen/MonthlySpends";
import { Colors } from "@/constants/Colors";

import FloatingButton from "@/components/FloatingButton";
import { router, useFocusEffect } from "expo-router";
import DottedButton from "@/components/DottedButton";

export default function HomeScreen() {
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
