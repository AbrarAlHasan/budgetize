import { Image, StyleSheet, Platform, Text, Pressable } from "react-native";

import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import {
  SafeAreaInsetsContext,
  SafeAreaView,
} from "react-native-safe-area-context";
import { useState } from "react";
import DateRangePicker from "@/components/DateRangePicker";

export default function HomeScreen() {
  const [isDateRangePickerOpen, setIsDateRangePickerOpen] = useState(false);

  const onCancel = () => {
    setIsDateRangePickerOpen(false);
  };
  const onConfirm = (data) => {
    console.log(data);
  };
  return (
    <>
      <Text>Home Screen</Text>

      <Pressable onPress={() => setIsDateRangePickerOpen(true)}>
        <Text>Open Date Range Picker</Text>
      </Pressable>

      <DateRangePicker
        isVisible={isDateRangePickerOpen}
        onCancel={onCancel}
        mode="range"
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
