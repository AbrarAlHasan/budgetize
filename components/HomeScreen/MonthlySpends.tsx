import { StyleSheet, Text, useColorScheme, View } from "react-native";
import React, { useEffect, useState } from "react";
import Header from "./Header";
import CategoryBudget from "./CategoryBudget";
import {
  formatDateTimeTimezone,
  getCurrentMonthRange,
} from "@/utils/DateCalculator";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import ChipText from "../ChipText";
import { textStyles } from "@/stylings/CustomStyles";
import {
  disableLoading,
  enableLoading,
} from "@/redux/reducers/slice/globalSlice";
import { copyPreviousBudget, insertBudgetToDB } from "@/api/budget.action";
import { useToast } from "react-native-toast-notifications";
import { router } from "expo-router";
import { Colors } from "@/constants/Colors";
import { triggerHomeApi } from "@/redux/reducers/slice/homeSlice";

const MonthlySpends = () => {
  const homeSlice = useSelector((state: RootState) => state.HomeSlice);

  const dispatch = useDispatch();

  const toast = useToast();

  const [dateRangeToCopy, setDateRangeToCopy] = useState({
    fromDate: new Date(),
    toDate: new Date(),
  });

  const [showAddBudget, setShowAddBudget] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    setShowAddBudget(false);
  }, [homeSlice?.dateRange]);

  const usePreviousData = async () => {
    dispatch(enableLoading());

    const response = await copyPreviousBudget({
      fromDate: homeSlice?.dateRange?.fromDate,
      toDate: homeSlice?.dateRange?.toDate,
      useLoading: true,
      type: "MONTHLY",
    });

    if (response?.fetchedSuccess) {
      setDateRangeToCopy({
        fromDate: response?.fromDate,
        toDate: response?.toDate,
      });
      toast.show(
        `Budget Copied from ${formatDateTimeTimezone(
          response?.fromDate,
          "MMM DD"
        )} - ${formatDateTimeTimezone(response?.toDate, "MMM DD")}`,
        {
          duration: 2000,
        }
      );
      await insertBudgetToDB({
        fromDate: homeSlice?.dateRange?.fromDate,
        toDate: homeSlice?.dateRange?.toDate,
        budgetList: response?.budgetList,
      });
      dispatch(triggerHomeApi());
    }
    dispatch(disableLoading());

    if (response?.error === true) {
      setDateRangeToCopy({
        fromDate: new Date(),
        toDate: new Date(),
      });
      setShowAddBudget(true);
      toast.show(response?.message, {
        duration: 3000,
      });
    }
  };

  return (
    <>
      <Header
        label="Monthly"
        leftOverDays={28}
        budgeted={homeSlice.totalMonthlyBudget}
        left={homeSlice.totalMonthlyBudget - homeSlice.totalMonthlyBudgetLeft}
        fromDate={getCurrentMonthRange().fromDate}
        toDate={getCurrentMonthRange().toDate}
      />
      {homeSlice?.monthlyCategoryBudget?.length === 0 && !showAddBudget && (
        <View style={{ marginVertical: 20, alignItems: "center" }}>
          <Text style={[textStyles.mdBold, { marginVertical: 20 }]}>
            There is No Budget Configured
          </Text>
          <ChipText
            chipText="Use Previous Month Budget"
            onPress={() => {
              usePreviousData();
            }}
          />
        </View>
      )}
      {homeSlice?.monthlyCategoryBudget?.length === 0 && showAddBudget && (
        <View style={{ marginVertical: 20, alignItems: "center" }}>
          <Text style={[textStyles.mdBold, { marginVertical: 20 }]}>
            There is No Budget Configured
          </Text>
          <ChipText
            chipText="Add New Budget"
            onPress={() => {
              router.navigate("/(addBudget)/addBudget");
            }}
            chipTextStyle={{
              color: Colors[colorScheme ?? "light"].darkOrange,
            }}
            chipViewStyle={{
              backgroundColor: Colors[colorScheme ?? "light"].lightOrange,
            }}
          />
        </View>
      )}
      {homeSlice.monthlyCategoryBudget?.map((data, idx) => (
        <CategoryBudget
          key={data?.category_id}
          data={data}
          type="MONTHLY"
          idx={idx}
        />
      ))}
    </>
  );
};

export default MonthlySpends;

const styles = StyleSheet.create({});
