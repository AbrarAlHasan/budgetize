import { StyleSheet, Text, View } from "react-native";
import React from "react";
import Header from "./Header";
import CategoryBudget from "./CategoryBudget";
import { getCurrentMonthRange } from "@/utils/DateCalculator";

const MonthlySpends = () => {
  return (
    <>
      <Header
        label="Monthly"
        leftOverDays={28}
        budgeted={5000}
        left={1300}
        fromDate={getCurrentMonthRange().fromDate}
        toDate={getCurrentMonthRange().toDate}
      />
      <CategoryBudget />
      <CategoryBudget />
      <CategoryBudget />
      <CategoryBudget />
    </>
  );
};

export default MonthlySpends;

const styles = StyleSheet.create({});
