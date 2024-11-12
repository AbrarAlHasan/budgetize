import { StyleSheet, Text, View } from "react-native";
import React from "react";
import RNMonthPicker from "react-native-month-year-picker";

interface MonthPicker {
  date: Date;
  onChange: any;
}

const MonthPicker = ({ date, onChange }: MonthPicker) => {
  return (
    <>
      <RNMonthPicker value={date} onChange={(date) => console.log(date)} />
    </>
  );
};

export default MonthPicker;

const styles = StyleSheet.create({});
