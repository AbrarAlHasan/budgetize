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
      {homeSlice.weeklyCategories?.length > 0 && (
        <>
          <Header
            label="Weekly"
            leftOverDays={6}
            budgeted={homeSlice.totalWeeklyBudget}
            left={homeSlice.totalWeeklyBudget - homeSlice.totalWeeklyBudgetLeft}
            fromDate={
              getCurrentWeekRange(homeSlice.dateRange.fromDate).fromDate
            }
            toDate={getCurrentWeekRange(homeSlice.dateRange.toDate).toDate}
          />
          {homeSlice.weeklyCategories?.map((data, idx) => (
            <CategoryBudget
              key={data?.category_id}
              data={data}
              type="WEEKLY"
              idx={idx}
            />
          ))}
        </>
      )}
    </>
  );
};

export default WeeklySpends;

const styles = StyleSheet.create({});
