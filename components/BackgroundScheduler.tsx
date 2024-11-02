import { StyleSheet, Text, View } from "react-native";
import React, { useEffect } from "react";
import {
  fetchHomeDataV2,
  getCurrentMonthBudget,
  getCurrentMonthBudgetV2,
  getCurrentWeekBudget,
  getCurrentWeekBudgetV2,
  getMonthlyCategoryList,
  getWeeklyCategoryList,
} from "@/api/home.action";
import { useDispatch, useSelector } from "react-redux";
import { ICategory, ITransaction } from "@/types/HomeScreenTypes";
import {
  setDateRange,
  setIsDateRangeVisible,
  setMonthlyCategories,
  setMonthlyCategoryBudget,
  setMonthlyCategoryList,
  setTotalMonthlyBudget,
  setTotalMonthlyBudgetLeft,
  setTotalWeeklyBudget,
  setTotalWeeklyBudgetLeft,
  setWeeklyCategories,
  setWeeklyCategoryBudget,
  setWeeklyCategoryList,
} from "@/redux/reducers/slice/homeSlice";
import { RootState } from "@/redux/store";
import {
  getCurrentMonthRange,
  getCurrentWeekRange,
} from "@/utils/DateCalculator";
import DateRangePicker from "./DateRangePicker";
import SafeAreaWrapper from "./SafeAreaWrapper";
import {
  disableLoading,
  enableLoading,
} from "@/redux/reducers/slice/globalSlice";

const BackgroundScheduler = () => {
  const dispatch = useDispatch();
  const homeSlice = useSelector((state: RootState) => state.HomeSlice);

  const onCancel = () => {
    dispatch(setIsDateRangeVisible(false));
  };
  const onConfirm = (data: any) => {
    dispatch(setDateRange(getCurrentWeekRange(data?.startDateString)));
    dispatch(setIsDateRangeVisible(false));
    fetchHomeDataV2(true);
  };

  return (
    <>
      {homeSlice.isDateRangeVisible && (
        <DateRangePicker
          isVisible={homeSlice.isDateRangeVisible}
          onCancel={onCancel}
          mode="range"
          onConfirm={onConfirm}
        />
      )}
    </>
  );
};

export default BackgroundScheduler;

const styles = StyleSheet.create({});
