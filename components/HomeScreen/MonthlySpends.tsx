import { StyleSheet, Text, View } from "react-native";
import React from "react";
import Header from "./Header";
import CategoryBudget from "./CategoryBudget";
import { getCurrentMonthRange } from "@/utils/DateCalculator";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

const MonthlySpends = () => {
  const homeSlice = useSelector((state: RootState) => state.HomeSlice);

  return (
    <>
      {homeSlice.monthlyCategories?.length > 0 && (
        <>
          <Header
            label="Monthly"
            leftOverDays={28}
            budgeted={homeSlice.totalMonthlyBudget}
            left={
              homeSlice.totalMonthlyBudget - homeSlice.totalMonthlyBudgetLeft
            }
            fromDate={getCurrentMonthRange().fromDate}
            toDate={getCurrentMonthRange().toDate}
          />
          {homeSlice.monthlyCategories?.map((data, idx) => (
            <CategoryBudget
              key={data?.category_id}
              data={data}
              type="MONTHLY"
              idx={idx}
            />
          ))}
        </>
      )}
    </>
  );
};

export default MonthlySpends;

const styles = StyleSheet.create({});
