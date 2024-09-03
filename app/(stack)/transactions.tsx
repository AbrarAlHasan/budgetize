import { StyleSheet, Text, useColorScheme, View } from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { getTransactionsBasedOnCategory } from "@/api/home.action";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import {
  diffInDays,
  formatDateTimeTimezone,
  getCurrentMonthRange,
  getCurrentWeekRange,
} from "@/utils/DateCalculator";
import { ICategory, IDateRange } from "@/types/HomeScreenTypes";
import { textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";
import { formatPrice } from "@/utils/PriceFormatter";
import TransactionList from "@/components/HomeScreen/transactionList";

const Transactions = () => {
  const { category_id, type } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const homeSlice = useSelector((state: RootState) => state.HomeSlice);

  const [categoryDetails, setCategoryDetails] = useState<ICategory>();
  const [dateRange, setDateRange] = useState<IDateRange>({
    fromDate: new Date(),
    toDate: new Date(),
  });

  const [totalAmountSpent, setTotalAmountSpent] = useState(0);

  useEffect(() => {
    // let fromDate = new Date();
    // let toDate = new Date();
    // if (type === "MONTHLY") {
    //   fromDate = getCurrentMonthRange(homeSlice.dateRange.fromDate).fromDate;
    //   toDate = getCurrentMonthRange(homeSlice.dateRange.fromDate).toDate;
    // } else {
    //   fromDate = homeSlice.dateRange.fromDate;
    //   toDate = homeSlice.dateRange.toDate;
    // }
    // const response = getTransactionsBasedOnCategory(Number(category_id), fromDate, toDate);
    let selectedCategory;
    if (type === "MONTHLY") {
      selectedCategory = homeSlice.monthlyCategories.filter(
        (data) => data.category_id == Number(category_id)
      )[0];
      setCategoryDetails(selectedCategory);

      setDateRange(getCurrentMonthRange(homeSlice.dateRange.fromDate));
    }
    if (type === "WEEKLY") {
      selectedCategory = homeSlice.weeklyCategories.filter(
        (data) => data.category_id == Number(category_id)
      )[0];
      setCategoryDetails(selectedCategory);

      setDateRange(getCurrentWeekRange(homeSlice.dateRange.fromDate));
    }

    setTotalAmountSpent(
      selectedCategory?.transactions?.reduce(
        (acc, cur) => acc + cur.amount,
        0
      ) || 0
    );
  }, [category_id]);
  return (
    <View style={{ padding: 20, flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={[textStyles.bolder, textStyles.xxxl]}>
          {categoryDetails?.icon}
        </Text>
        <Text style={[textStyles.bolder, textStyles.xl]}>
          {categoryDetails?.category_name}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          marginTop: 10,
          justifyContent: "space-between",
        }}
      >
        <View style={{ gap: 4 }}>
          <Text style={[textStyles.bolder, textStyles.xl]}>
            {type === "WEEKLY"
              ? `${formatDateTimeTimezone(
                  dateRange?.fromDate,
                  "MMM D"
                )} - ${formatDateTimeTimezone(dateRange?.toDate, "D")}`
              : formatDateTimeTimezone(dateRange.fromDate, "MMM YYYY")}
          </Text>
          <Text
            style={[
              textStyles.semiBold,
              { color: Colors[colorScheme ?? "light"].gray },
            ]}
          >
            {diffInDays(dateRange.fromDate, dateRange?.toDate)}
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[textStyles.semiBold, textStyles.sm]}>
              {formatPrice().format(categoryDetails?.amount_allocated || 0)}
            </Text>
            <Text> Budgeted</Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <Text style={[textStyles.semiBold, textStyles.sm]}>
              {formatPrice().format(totalAmountSpent || 0)}
            </Text>
            <Text> Left</Text>
          </View>
        </View>
      </View>
      <View
        style={{
          marginTop: 10,
          height: 1,
          width: "100%",
          backgroundColor: Colors[colorScheme ?? "light"].primary,
          opacity: 0.5,
        }}
      />
      <TransactionList transactions={categoryDetails?.transactions || []} />
    </View>
  );
};

export default Transactions;

const styles = StyleSheet.create({});
