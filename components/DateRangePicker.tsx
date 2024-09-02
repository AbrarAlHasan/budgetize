import { StyleSheet, Text, useColorScheme, View } from "react-native";
import React, { useEffect, useState } from "react";

import DatePicker from "react-native-neat-date-picker";
import { Mode } from "react-native-neat-date-picker/src/components/Key";
import { Colors } from "@/constants/Colors";
import { getCurrentWeekRange } from "@/utils/DateCalculator";

interface IDateRangePicker {
  isVisible: boolean;
  mode: Mode;
  onCancel: () => void;
  onConfirm?: ({
    date,
    dateString,
  }: {
    date: Date;
    dateString: string;
  }) => void;
}

const DateRangePicker = ({
  isVisible,
  mode,
  onCancel,
  onConfirm,
}: IDateRangePicker) => {
  const colorScheme = useColorScheme();

  const [startDate, setStartDate] = useState(getCurrentWeekRange().fromDate);
  const [endDate, setEndDate] = useState(getCurrentWeekRange().toDate);

  useEffect(() => {
    const weekRange = getCurrentWeekRange();
    setStartDate(weekRange.fromDate);
    setEndDate(weekRange.toDate);
  }, []);
  return (
    <DatePicker
      isVisible={isVisible}
      mode={mode}
      onCancel={onCancel}
      onConfirm={(data) => console.log(data)}
      colorOptions={{
        headerColor: Colors[colorScheme ?? "light"].primary,
        weekDaysColor: Colors[colorScheme ?? "light"].primary,
        selectedDateBackgroundColor: Colors[colorScheme ?? "light"].primary,
        confirmButtonColor: Colors[colorScheme ?? "light"].primary,
      }}
      startDate={startDate}
      endDate={endDate}
      onKeyPressCustom={(data: any) => {
        const weekRange = getCurrentWeekRange(data.startDate);
        console.log(weekRange)
        setStartDate(weekRange.fromDate);
        setEndDate(weekRange.toDate);
      }}
    ></DatePicker>
  );
};

export default DateRangePicker;

const styles = StyleSheet.create({});
