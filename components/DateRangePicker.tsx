import { StyleSheet, Text, useColorScheme, View } from "react-native";
import React, { useEffect, useState } from "react";

import DatePicker from "react-native-neat-date-picker";
import { Mode } from "react-native-neat-date-picker/src/components/Key";
import { Colors } from "@/constants/Colors";
import { getCurrentWeekRange } from "@/utils/DateCalculator";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

interface IDateRangePicker {
  isVisible: boolean;
  mode: Mode;
  onCancel: () => void;
  onConfirm?: any;
}

const DateRangePicker = ({
  isVisible,
  mode,
  onCancel,
  onConfirm,
}: IDateRangePicker) => {
  const colorScheme = useColorScheme();

  const homeSlice = useSelector((state: RootState) => state.HomeSlice);

  const [startDate, setStartDate] = useState(homeSlice?.dateRange?.fromDate);
  const [endDate, setEndDate] = useState(homeSlice?.dateRange?.toDate);

  useEffect(() => {
    setStartDate(homeSlice?.dateRange?.fromDate);
    setEndDate(homeSlice?.dateRange?.toDate);
  }, []);
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
      startDate={startDate}
      endDate={endDate}
      onKeyPressCustom={(data: any) => {
        const weekRange = getCurrentWeekRange(data.startDate);

        setStartDate(weekRange.fromDate);
        setEndDate(weekRange.toDate);
      }}
    ></DatePicker>
  );
};

export default DateRangePicker;

const styles = StyleSheet.create({});
