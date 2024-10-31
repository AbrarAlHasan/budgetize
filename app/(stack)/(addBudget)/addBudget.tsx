import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import SafeAreaWrapper from "@/components/SafeAreaWrapper";
import CustomHomeHeader from "@/components/navigation/CustomHeader/CustomHomeHeader";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";
import { useDispatch, useSelector } from "react-redux";
import { RootState, store } from "@/redux/store";
import {
  formatDateTimeTimezone,
  getCurrentMonthRange,
  getCurrentWeekRange,
} from "@/utils/DateCalculator";
import { supabase } from "@/lib/supabase";
import { fetchAddBudgetList } from "@/api/category.action";
import { IAddBudgetCategory } from "@/types/HomeScreenTypes";

import { Colors } from "@/constants/Colors";
import { formatPrice } from "@/utils/PriceFormatter";
import Checkbox from "expo-checkbox";
import ChipText from "@/components/ChipText";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Feather from "@expo/vector-icons/Feather";
import { triggerHomeApi } from "@/redux/reducers/slice/homeSlice";
import { router, useFocusEffect } from "expo-router";
import {
  disableLoading,
  enableLoading,
} from "@/redux/reducers/slice/globalSlice";

const AddBudget = () => {
  const colorScheme = useColorScheme();
  const dispatch = useDispatch();

  const homeSlice = useSelector((state: RootState) => state.HomeSlice);
  const [weeklyCategoryList, setWeeklyCategoryList] =
    useState<Array<IAddBudgetCategory>>();
  const [monthlyCategoryList, setMonthlyCategoryList] =
    useState<Array<IAddBudgetCategory>>();

  useEffect(() => {
    getCategoryList();
  }, [homeSlice.dateRange.fromDate]);

  useFocusEffect(
    useCallback(() => {
      getCategoryList();

      return () => {};
    }, [homeSlice.dateRange.fromDate])
  );

  const getCategoryList = async () => {
    dispatch(enableLoading());

    const weeklyDateRange = getCurrentWeekRange(homeSlice.dateRange.fromDate);
    const monthlyDateRange = getCurrentMonthRange(homeSlice.dateRange.fromDate);

    const [weeklyResponse, monthlyResponse] = await Promise.all([
      fetchAddBudgetList({
        type: "WEEKLY",
        ...weeklyDateRange,
      }),
      fetchAddBudgetList({
        type: "MONTHLY",
        ...monthlyDateRange,
      }),
    ]);
    setWeeklyCategoryList(weeklyResponse);
    setMonthlyCategoryList(monthlyResponse);
    dispatch(disableLoading());
  };

  const generateBudgetPayload = ({
    categoryDetails,
  }: {
    categoryDetails: IAddBudgetCategory | null;
  }) => {
    const payload: any = {
      user_id: store.getState().AuthSlice.userDetails?.user_id,
      category_id: categoryDetails?.category_id,
      category_type: categoryDetails?.type,
      amount: 0,
    };

    if (categoryDetails?.type === "WEEKLY") {
      const dateRange = getCurrentWeekRange(homeSlice.dateRange.fromDate);
      payload.from_date = formatDateTimeTimezone(dateRange?.fromDate);
      payload.to_date = formatDateTimeTimezone(dateRange?.toDate);
    }
    if (categoryDetails?.type === "MONTHLY") {
      const dateRange = getCurrentMonthRange(homeSlice.dateRange.fromDate);
      payload.from_date = formatDateTimeTimezone(dateRange?.fromDate);
      payload.to_date = formatDateTimeTimezone(dateRange?.toDate);
    }
    return payload;
  };

  const addNewBudget = async ({
    type,
    categoryId,
  }: {
    categoryId: IAddBudgetCategory["category_id"];
    type: IAddBudgetCategory["type"];
  }) => {
    let selectedCategory = null;
    dispatch(enableLoading());
    if (type === "WEEKLY" && weeklyCategoryList) {
      const index = weeklyCategoryList?.findIndex(
        (category) => category?.category_id === categoryId
      );
      selectedCategory = weeklyCategoryList[index];
    }

    if (type === "MONTHLY" && monthlyCategoryList) {
      const index = monthlyCategoryList?.findIndex(
        (category) => category?.category_id === categoryId
      );
      selectedCategory = monthlyCategoryList[index];
    }

    const payload = generateBudgetPayload({
      categoryDetails: selectedCategory,
    });
    console.log(payload);

    const response = await supabase.from("budget").insert(payload);
    dispatch(disableLoading());

    getCategoryList();
    dispatch(triggerHomeApi());
    console.log("Budget Added Response", response);
  };

  return (
    <>
      <CustomHomeHeader onlyDateRange={true} showBack={true} />
      <ScrollView
        style={{
          backgroundColor: Colors[colorScheme ?? "light"].background,
          paddingHorizontal: 10,
          borderTopWidth: 1,
          borderColor: Colors[colorScheme ?? "light"].lightGray,
        }}
      >
        <View
          style={[
            commonStyles.alignJustifyCenter,
            {
              paddingVertical: 10,
              backgroundColor: Colors[colorScheme ?? "light"].lightText,
              marginVertical: 10,
            },
          ]}
        >
          <Text style={[textStyles.bolder]}>Weekly Category List</Text>
        </View>
        <View style={{ gap: 20 }}>
          {weeklyCategoryList?.map((data) => {
            return (
              <CategoryList
                key={data?.budgetDetails?.id}
                data={data}
                addNewBudget={addNewBudget}
              />
            );
          })}
        </View>

        <View
          style={[
            commonStyles.alignJustifyCenter,
            {
              paddingVertical: 10,
              backgroundColor: Colors[colorScheme ?? "light"].lightText,
              marginVertical: 10,
            },
          ]}
        >
          <Text style={[textStyles.bolder]}>Monthly Category List</Text>
        </View>
        <View style={{ gap: 20 }}>
          {monthlyCategoryList?.map((data) => {
            return (
              <CategoryList
                key={data?.category_id}
                data={data}
                addNewBudget={addNewBudget}
              />
            );
          })}
        </View>
      </ScrollView>
    </>
  );
};

export default AddBudget;

const styles = StyleSheet.create({});

export const CategoryList = ({
  data,
  addNewBudget,
}: {
  data: IAddBudgetCategory;
  addNewBudget: ({
    type,
    categoryId,
  }: {
    categoryId: IAddBudgetCategory["category_id"];
    type: IAddBudgetCategory["type"];
  }) => void;
}) => {
  const colorScheme = useColorScheme();
  const included = data["budgetDetails"] ? true : false;
  return (
    <>
      <Pressable
        key={data?.category_id}
        style={[
          commonStyles.alignJustifyCenter,
          { flexDirection: "row", flex: 1 },
        ]}
      >
        <View
          style={[
            commonStyles.alignJustifyCenter,
            {
              backgroundColor: data?.background_color || Colors.dark.primary,
              borderRadius: 100,
              aspectRatio: 1,
              height: 40,
            },
          ]}
        >
          <Text style={[textStyles.xl, { paddingLeft: 3, paddingTop: 2 }]}>
            {data?.icon}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            marginLeft: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: 10, maxWidth: "80%" }}>
            <Text
              style={[
                textStyles.bolder,
                textStyles.sm,
                {
                  color: Colors[colorScheme ?? "light"].darkText,
                },
              ]}
            >
              {data?.category_name}
            </Text>

            {/* {data?.isModified ? (
              <ChipText
                chipText={"Modified"}
                chipViewStyle={{
                  backgroundColor: Colors[colorScheme ?? "light"].lightOrange,
                }}
                chipTextStyle={{
                  color: Colors[colorScheme ?? "light"].darkOrange,
                  ...textStyles.semiBold,
                }}
              />
            ) : (
              <ChipText
                chipText={included ? "Already Included" : "Not Included"}
                chipViewStyle={{
                  backgroundColor: included
                    ? Colors[colorScheme ?? "light"].lightGreen
                    : Colors[colorScheme ?? "light"].lightRed,
                }}
                chipTextStyle={{
                  color: included
                    ? Colors[colorScheme ?? "light"].darkGreen
                    : Colors[colorScheme ?? "light"].darkRed,
                  ...textStyles.semiBold,
                }}
              />
            )} */}
          </View>
          {data?.budgetDetails && (
            <Pressable
              onPress={() =>
                router.navigate({
                  pathname: "/addTransaction",
                  params: {
                    type: "BUDGET",
                    budgetId: data?.budgetDetails?.id,
                    budgetAmount: data?.budgetDetails?.amount,
                  },
                })
              }
              style={{ flexDirection: "row", gap: 3, alignSelf: "center" }}
            >
              <Text style={[textStyles.bolder]}>
                {formatPrice().format(data?.budgetDetails?.amount || 0)}
              </Text>
              <Feather
                name="edit-3"
                size={18}
                color={Colors[colorScheme ?? "light"].darkText}
              />
            </Pressable>
          )}

          {!data?.budgetDetails && (
            <ChipText
              chipText="Add"
              chipViewStyle={{
                backgroundColor: Colors[colorScheme ?? "light"].lightOrange,
              }}
              chipTextStyle={{
                color: Colors[colorScheme ?? "light"].darkOrange,
              }}
              onPress={() =>
                addNewBudget({
                  categoryId: data?.category_id,
                  type: data?.type,
                })
              }
            />
          )}
        </View>
      </Pressable>
    </>
  );
};
