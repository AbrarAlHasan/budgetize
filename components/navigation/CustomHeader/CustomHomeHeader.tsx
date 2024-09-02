import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { header, textStyles } from "@/stylings/CustomStyles";
import { ThemedText } from "@/components/ThemedText";

import { Colors } from "@/constants/Colors";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setIsDateRangeVisible } from "@/redux/reducers/slice/homeSlice";
import { formatDateTimeTimezone } from "@/utils/DateCalculator";
const CustomHomeHeader = () => {
  const colorScheme = useColorScheme();

  const homeSlice = useSelector((state: RootState) => state.HomeSlice);
  const dispatch = useDispatch();

  return (
    <SafeAreaView
      style={[
        header.headerLayout,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
    >
      <FontAwesome6
        name="business-time"
        size={24}
        color={Colors[colorScheme ?? "light"].primary}
      />
      <Pressable
        onPress={() => {
          dispatch(setIsDateRangeVisible(true));
        }}
      >
        <Text style={[textStyles.bolder, textStyles.lg]}>
          {`${formatDateTimeTimezone(
            homeSlice.dateRange.fromDate,
            "MMM DD"
          )} - ${formatDateTimeTimezone(homeSlice.dateRange.toDate, "MMM DD")}`}
        </Text>
      </Pressable>
      <FontAwesome6
        name="edit"
        size={24}
        color={Colors[colorScheme ?? "light"].primary}
      />
    </SafeAreaView>
  );
};

export default CustomHomeHeader;

const styles = StyleSheet.create({});
