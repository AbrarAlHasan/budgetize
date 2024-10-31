import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import React from "react";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { header, textStyles } from "@/stylings/CustomStyles";
import { ThemedText } from "@/components/ThemedText";

import { Colors } from "@/constants/Colors";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setIsDateRangeVisible } from "@/redux/reducers/slice/homeSlice";
import { formatDateTimeTimezone } from "@/utils/DateCalculator";
import { router } from "expo-router";
import { initiateLogout } from "@/api/authentication.action";
import { AntDesign } from "@expo/vector-icons";
const CustomHomeHeader = ({
  onlyDateRange,
  showBack,
}: {
  onlyDateRange?: boolean;
  showBack?: boolean;
}) => {
  const colorScheme = useColorScheme();
  const { top } = useSafeAreaInsets();

  const homeSlice = useSelector((state: RootState) => state.HomeSlice);
  const dispatch = useDispatch();

  return (
    <View
      style={[
        header.headerLayout,
        {
          backgroundColor: Colors[colorScheme ?? "light"].background,
          paddingTop: top + 10,
          paddingBottom: 20,
          justifyContent: onlyDateRange ? "center" : "space-between",
          position: "relative",
        },
      ]}
    >
      {showBack && (
        <Pressable
          onPress={() => {
            router.back();
          }}
          style={{ position: "absolute", left: 10, zIndex: 20, bottom: 20 }}
        >
          <AntDesign
            name="left"
            size={24}
            color={Colors[colorScheme ?? "light"].darkText}
          />
        </Pressable>
      )}

      {!onlyDateRange && (
        <Pressable onPress={() => {}}>
          <FontAwesome6
            name="business-time"
            size={24}
            color={Colors[colorScheme ?? "light"].primary}
          />
        </Pressable>
      )}
      <Pressable
        onPress={() => {
          dispatch(setIsDateRangeVisible(true));
        }}
      >
        <Text
          style={[
            textStyles.bolder,
            textStyles.lg,
            { color: Colors[colorScheme ?? "light"].darkText },
          ]}
        >
          {`${formatDateTimeTimezone(
            homeSlice.dateRange.fromDate,
            "MMM DD"
          )} - ${formatDateTimeTimezone(homeSlice.dateRange.toDate, "MMM DD")}`}
        </Text>
      </Pressable>
      {!onlyDateRange && (
        <Pressable
          onPress={() => {
            router.navigate("/(stack)/addCategory");
          }}
        >
          <FontAwesome6
            name="edit"
            size={24}
            color={Colors[colorScheme ?? "light"].primary}
          />
        </Pressable>
      )}
    </View>
  );
};

export default CustomHomeHeader;

const styles = StyleSheet.create({});
