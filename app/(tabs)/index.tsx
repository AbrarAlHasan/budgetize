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
import { useToast } from "react-native-toast-notifications";

export default function HomeScreen() {
  const colorScheme = useColorScheme();

  const toast = useToast();
  
  // useEffect(() => {
  //   toast.show("Hello");
  // }, []);

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
          label="Add / Edit Budget"
          onPress={() => {
            router.navigate("/(stack)/(addBudget)/addBudget");
          }}
        />
      </ScrollView>

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
