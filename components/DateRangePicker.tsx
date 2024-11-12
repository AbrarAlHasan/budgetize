import { StyleSheet, Text, useColorScheme, View } from "react-native";
import React, { useEffect, useState } from "react";

import DatePicker from "react-native-neat-date-picker";
import { Mode } from "react-native-neat-date-picker/src/components/Key";
import { Colors } from "@/constants/Colors";
import { getCurrentWeekRange } from "@/utils/DateCalculator";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import moment from "moment";

interface IDateRangePicker {
  isVisible: boolean;
  mode: Mode;
  onCancel: () => void;
  onConfirm?: any;
  dateRange?: { startDate?: Date; endDate?: Date };
}

const DateRangePicker = ({
  isVisible,
  mode,
  onCancel,
  onConfirm,
  dateRange,
}: IDateRangePicker) => {
  const colorScheme = useColorScheme();

  const homeSlice = useSelector((state: RootState) => state.HomeSlice);

  const [startDate, setStartDate] = useState(homeSlice?.dateRange?.fromDate);
  const [endDate, setEndDate] = useState(homeSlice?.dateRange?.toDate);

  useEffect(() => {
    if (dateRange?.startDate) {
      setStartDate(dateRange?.startDate);
    } else {
      setStartDate(homeSlice?.dateRange?.fromDate);
    }
    if (dateRange?.endDate) {
      setEndDate(dateRange?.endDate);
    } else {
      setEndDate(homeSlice?.dateRange?.toDate);
    }
  }, [isVisible]);
  return (
    <DatePicker
      isVisible={isVisible}
      mode={mode}
      onCancel={onCancel}
      onConfirm={onConfirm}
      colorOptions={{
        headerColor: Colors[colorScheme ?? "light"].primary,
        weekDaysColor: Colors[colorScheme ?? "light"].primary,
        selectedDateBackgroundColor: Colors[colorScheme ?? "light"].primary,
        confirmButtonColor: Colors[colorScheme ?? "light"].primary,
        backgroundColor: Colors[colorScheme ?? "light"].background,
        dateTextColor: Colors[colorScheme ?? "light"].darkText,
        changeYearModalColor: Colors[colorScheme ?? "light"].primary,
        headerTextColor: Colors[colorScheme ?? "light"].lightText,
        selectedDateTextColor: Colors[colorScheme ?? "light"].lightText,
      }}
      initialDate={new Date(startDate)}
      startDate={new Date(startDate)}
      endDate={new Date(endDate)}
      onKeyPressCustom={(data: any) => {
        if (mode === "single") {
          setStartDate(data.date);
          setEndDate(data.date);
        } else {
          const weekRange = getCurrentWeekRange(data.startDate);
          setStartDate(weekRange.fromDate);
          setEndDate(weekRange.toDate);
        }
      }}
      modalStyles={{ top: -50 }}
      onShortcutPress={(data) => {
        if (data === "LAST_WEEK") {
          const weekRange = getCurrentWeekRange(
            moment().subtract(1, "week").toDate()
          );
          setStartDate(weekRange.fromDate);
          setEndDate(weekRange.toDate);
        }

        if (data === "THIS_WEEK") {
          const weekRange = getCurrentWeekRange(moment().toDate());
          setStartDate(weekRange.fromDate);
          setEndDate(weekRange.toDate);
        }

        if (data === "NEXT_WEEK") {
          const weekRange = getCurrentWeekRange(
            moment().add(1, "week").toDate()
          );
          setStartDate(weekRange.fromDate);
          setEndDate(weekRange.toDate);
        }
      }}
    />
  );
};

export default DateRangePicker;

const styles = StyleSheet.create({});
