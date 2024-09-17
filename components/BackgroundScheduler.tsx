import { StyleSheet, Text, View } from "react-native";
import React, { useEffect } from "react";
import {
  getCurrentMonthBudget,
  getCurrentWeekBudget,
  getMonthlyCategoryList,
  getWeeklyCategoryList,
} from "@/api/home.action";
import { useDispatch, useSelector } from "react-redux";
import { ICategory, ITransaction } from "@/types/HomeScreenTypes";
import {
  setMonthlyCategories,
  setMonthlyCategoryList,
  setTotalMonthlyBudget,
  setTotalMonthlyBudgetLeft,
  setTotalWeeklyBudget,
  setTotalWeeklyBudgetLeft,
  setWeeklyCategories,
  setWeeklyCategoryList,
} from "@/redux/reducers/slice/homeSlice";
import { RootState } from "@/redux/store";
import { getCurrentMonthRange } from "@/utils/DateCalculator";

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

  useEffect(() => {
    console.log("TRIGGERED CATEGORY BACKGROUND", authSlice?.isAuthenticated);

    if (!authSlice?.isAuthenticated) {
      return;
    }
    fetchCategoryList();
  }, [authSlice?.isAuthenticated]);

  useEffect(() => {
    console.log("TRIGGERED HOME BACKGROUND", authSlice?.isAuthenticated);
    if (!authSlice?.isAuthenticated) {
      return;
    }
    fetchHomeData();
  }, [
    authSlice?.isAuthenticated,
    homeSlice.dateRange.fromDate,
    homeSlice.homeDataApiTrigger,
  ]);
  return <></>;
};

export default BackgroundScheduler;

const styles = StyleSheet.create({});
