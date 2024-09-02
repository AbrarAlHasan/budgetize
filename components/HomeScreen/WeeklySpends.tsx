import { StyleSheet, Text, View } from "react-native";
import React from "react";
import Header from "./Header";
import CategoryBudget from "./CategoryBudget";
import { getCurrentWeekRange } from "@/utils/DateCalculator";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

const WeeklySpends = () => {
  const homeSlice = useSelector((state: RootState) => state.HomeSlice);
  return (
    <>
      <Header
        label="Weekly"
        leftOverDays={6}
        budgeted={5000}
        left={1300}
        fromDate={getCurrentWeekRange(homeSlice.dateRange.fromDate).fromDate}
        toDate={getCurrentWeekRange(homeSlice.dateRange.toDate).toDate}
      />
      <CategoryBudget />
      <CategoryBudget />
      <CategoryBudget />
      <CategoryBudget />
    </>
  );
};

export default WeeklySpends;

const styles = StyleSheet.create({});
