import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import React, { useEffect, useLayoutEffect, useState } from "react";
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
import {
  formatDateTimeTimezone,
  getCurrentWeekRange,
} from "@/utils/DateCalculator";
import { router } from "expo-router";
import { initiateLogout } from "@/api/authentication.action";
import { AntDesign } from "@expo/vector-icons";
import AppLogo from "../../../assets/images/ic_launcher.png";

const CustomHomeHeader = ({
  onlyDateRange,
  showBack,
  disableClick = false,
  customDate = null,
}: {
  onlyDateRange?: boolean;
  showBack?: boolean;
  disableClick?: boolean;
  customDate?: Date | null;
}) => {
  const colorScheme = useColorScheme();
  const { top } = useSafeAreaInsets();

  const homeSlice = useSelector((state: RootState) => state.HomeSlice);
  const dispatch = useDispatch();
  const [showSelectDateRangeLabel, setShowSelectDateRangeLabel] =
    useState(false);

  const [customDateRange, setCustomDateRange] = useState({
    fromDate: new Date(),
    toDate: new Date(),
  });
  useLayoutEffect(() => {
    if (customDate) {
      setCustomDateRange(getCurrentWeekRange(customDate));
    } else {
      setShowSelectDateRangeLabel(true);
      setTimeout(() => {
        setShowSelectDateRangeLabel(false);
      }, 5000);
    }
  }, []);

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
          !disableClick && dispatch(setIsDateRangeVisible(true));
        }}
        style={{ alignItems: "center" }}
      >
        {customDate ? (
          <Text
            style={[
              textStyles.bolder,
              textStyles.lg,
              { color: Colors[colorScheme ?? "light"].darkText },
            ]}
          >
            {`${formatDateTimeTimezone(
              customDateRange.fromDate,
              "MMM DD"
            )} - ${formatDateTimeTimezone(customDateRange.toDate, "MMM DD")}`}
          </Text>
        ) : (
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
            )} - ${formatDateTimeTimezone(
              homeSlice.dateRange.toDate,
              "MMM DD"
            )}`}
          </Text>
        )}
        {showSelectDateRangeLabel && (
          <Text
            style={[
              textStyles.xxs,
              { color: Colors[colorScheme ?? "light"].primary },
            ]}
          >
            Select Date Range
          </Text>
        )}
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
