import { StyleSheet, Text, View } from "react-native";
import React, { useEffect } from "react";
import {
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
  const authSlice = useSelector((state: RootState) => state.AuthSlice);

  const fetchCategoryList = async () => {
    const [weeklyCategory, monthlyCategory] = await Promise.all([
      getWeeklyCategoryList(),
      getMonthlyCategoryList(),
    ]);

    if (weeklyCategory?.error === null) {
      dispatch(setWeeklyCategoryList(weeklyCategory?.response));
    }
    if (monthlyCategory?.error === null) {
      dispatch(setMonthlyCategoryList(monthlyCategory?.response));
    }
  };

  const fetchHomeData = async () => {
    try {
      const [weeklyResponse, monthlyResponse] = await Promise.all([
        getCurrentWeekBudget({
          fromDate: homeSlice.dateRange.fromDate,
          toDate: homeSlice.dateRange.toDate,
        }),
        getCurrentMonthBudget(
          getCurrentMonthRange(homeSlice.dateRange.fromDate)
        ),
      ]);
      let weeklySpentAmount = 0;
      let monthlySpentAmount = 0;
      dispatch(
        setTotalWeeklyBudget(
          weeklyResponse?.response?.reduce((acc, currentValue: ICategory) => {
            const spentAmount = currentValue?.transactions?.reduce(
              (accu: number, curr: ITransaction) => accu + curr.amount,
              0
            );
            weeklySpentAmount += spentAmount;
            return acc + currentValue.amount_allocated;
          }, 0)
        )
      );
      dispatch(setWeeklyCategories(weeklyResponse?.response));

      dispatch(
        setTotalMonthlyBudget(
          monthlyResponse?.response?.reduce((acc, currentValue: ICategory) => {
            const spentAmount = currentValue?.transactions?.reduce(
              (accu: number, curr: ITransaction) => accu + curr.amount,
              0
            );
            monthlySpentAmount += spentAmount;
            return acc + currentValue.amount_allocated;
          }, 0)
        )
      );
      dispatch(setMonthlyCategories(monthlyResponse?.response));
      dispatch(setTotalWeeklyBudgetLeft(weeklySpentAmount));
      dispatch(setTotalMonthlyBudgetLeft(monthlySpentAmount));
    } catch (error) {
    } finally {
    }
  };

  // useEffect(() => {
  //   if (!authSlice?.isAuthenticated) {
  //     return;
  //   }
  //   fetchCategoryList();
  // }, [authSlice?.isAuthenticated, homeSlice.categoryDataApiTrigger]);

  const fetchHomeDataV2 = async () => {
    dispatch(enableLoading());
    const [weeklyResponse, monthlyResponse] = await Promise.all([
      getCurrentWeekBudgetV2({
        fromDate: homeSlice.dateRange.fromDate,
        toDate: homeSlice.dateRange.toDate,
      }),
      getCurrentMonthBudgetV2(
        getCurrentMonthRange(homeSlice.dateRange.fromDate)
      ),
    ]);

    if (monthlyResponse?.error === null) {
      dispatch(setMonthlyCategoryBudget(monthlyResponse?.response));
    }

    if (weeklyResponse?.error === null) {
      dispatch(setWeeklyCategoryBudget(weeklyResponse?.response));
    }
    dispatch(disableLoading());
  };

  useEffect(() => {
    if (!authSlice?.isAuthenticated || authSlice?.checkingAuthentication) {
      return;
    }
    // fetchHomeData();
    fetchHomeDataV2();
  }, [
    authSlice?.isAuthenticated,
    homeSlice.dateRange.fromDate,
    homeSlice.homeDataApiTrigger,
  ]);

  const onCancel = () => {
    dispatch(setIsDateRangeVisible(false));
  };
  const onConfirm = (data: any) => {
    dispatch(setDateRange(getCurrentWeekRange(data?.startDateString)));
    dispatch(setIsDateRangeVisible(false));
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
