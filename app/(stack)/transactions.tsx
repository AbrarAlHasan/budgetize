import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { getTransactionsBasedOnCategory } from "@/api/home.action";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import {
  diffInDays,
  formatDateTimeTimezone,
  getCurrentMonthRange,
  getCurrentWeekRange,
} from "@/utils/DateCalculator";
import {
  ICategory,
  ICategoryBudget,
  ICategoryV2,
  IDateRange,
} from "@/types/HomeScreenTypes";
import { textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";
import { formatPrice } from "@/utils/PriceFormatter";
import TransactionList from "@/components/HomeScreen/transactionList";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

const Transactions = () => {
  const { category_id, type } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const homeSlice = useSelector((state: RootState) => state.HomeSlice);

  const [categoryDetails, setCategoryDetails] = useState<ICategoryV2>();
  const [budgetDetails, setBudgetDetails] = useState<ICategoryBudget>();
  const [dateRange, setDateRange] = useState<IDateRange>({
    fromDate: new Date(),
    toDate: new Date(),
  });

  const [totalAmountSpent, setTotalAmountSpent] = useState(0);

  useEffect(() => {
    let selectedBudget;
    if (type === "WEEKLY") {
      selectedBudget = homeSlice.weeklyCategoryBudget?.filter(
        (data) => data?.category_id === Number(category_id)
      )[0];
    }

    if (type === "MONTHLY") {
      selectedBudget = homeSlice.monthlyCategoryBudget?.filter(
        (data) => data?.category_id === Number(category_id)
      )[0];
    }
    setBudgetDetails(selectedBudget);
    setCategoryDetails(selectedBudget?.category);
  }, [category_id]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: Colors[colorScheme ?? "light"].background,
      }}
    >
      <View style={{ padding: 20, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              flex: 1,
            }}
          >
            <Text style={[textStyles.bolder, textStyles.xxxl]}>
              {categoryDetails?.icon}
            </Text>
            <Text
              style={[
                textStyles.bolder,
                textStyles.xl,
                { color: Colors[colorScheme ?? "light"].darkText },
              ]}
            >
              {categoryDetails?.category_name}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable
              style={{
                backgroundColor: Colors[colorScheme ?? "light"].lightText,
                borderRadius: 100,
                padding: 6,
              }}
              onPress={() =>
                categoryDetails?.category_id &&
                router.navigate({
                  pathname: "/(stack)/addCategory",
                  params: {
                    categoryId: categoryDetails?.category_id.toString(),
                  },
                })
              }
            >
              <Ionicons
                name="pencil"
                size={16}
                color={Colors[colorScheme ?? "light"].gray}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                router.back();
              }}
              style={{
                backgroundColor: Colors[colorScheme ?? "light"].lightText,
                borderRadius: 100,
                padding: 6,
              }}
            >
              <Ionicons
                name="close-outline"
                size={16}
                color={Colors[colorScheme ?? "light"].gray}
              />
            </Pressable>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            marginTop: 10,
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: 4 }}>
            <Text
              style={[
                textStyles.bolder,
                textStyles.xl,
                { color: Colors[colorScheme ?? "light"].darkText },
              ]}
            >
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
              <Text
                style={[
                  textStyles.semiBold,
                  textStyles.sm,
                  { color: Colors[colorScheme ?? "light"].darkText },
                ]}
              >
                {formatPrice().format(budgetDetails?.amount || 0)}
              </Text>
              <Text style={{ color: Colors[colorScheme ?? "light"].darkText }}>
                {" "}
                Budgeted
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <Text
                style={[
                  textStyles.semiBold,
                  textStyles.sm,
                  { color: Colors[colorScheme ?? "light"].darkText },
                ]}
              >
                {formatPrice().format(
                  (budgetDetails?.amount || 0) -
                    (budgetDetails?.amountSpent || 0)
                )}
              </Text>
              <Text style={{ color: Colors[colorScheme ?? "light"].darkText }}>
                {" "}
                Left
              </Text>
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
        <TransactionList
          key={"Transaction"}
          transactions={budgetDetails?.transaction}
        />
      </View>
    </SafeAreaView>
  );
};

export default Transactions;

const styles = StyleSheet.create({});
