import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AntDesign from "@expo/vector-icons/AntDesign";
import CustomButton from "@/components/CustomButton";
import { formatPrice } from "@/utils/PriceFormatter";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";
import CustomTextInput from "@/components/CustomTextInput";
import BorderLine from "@/components/BorderLine";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateRangePicker from "@/components/DateRangePicker";
import {
  formatDateTimeTimezone,
  getCurrentMonthRange,
  getCurrentWeekRange,
} from "@/utils/DateCalculator";
import {
  ICategory,
  ICategoryBudget,
  ICategoryV2,
} from "@/types/HomeScreenTypes";
import Checkbox from "expo-checkbox";
import { useToast } from "react-native-toast-notifications";
import { supabase } from "@/lib/supabase";
import { useDispatch, useSelector } from "react-redux";
import { RootState, store } from "@/redux/store";
import { triggerHomeApi } from "@/redux/reducers/slice/homeSlice";
import {
  fetchHomeDataV2,
  getCategoryBasedOnDate,
  getCurrentMonthBudgetV2,
  getCurrentWeekBudgetV2,
} from "@/api/home.action";
import {
  disableLoading,
  enableLoading,
} from "@/redux/reducers/slice/globalSlice";
import log from "@/utils/Logger";

const ConfirmTransaction = () => {
  const routeParams = useLocalSearchParams();

  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const dispatch = useDispatch();

  const [isDateRangeVisible, setIsDateRangeVisible] = useState(false);
  const [spentDate, setSpentDate] = useState<Date>(new Date());

  const [selectedCategory, setSelectedCategory] =
    useState<ICategoryBudget | null>(null);

  const [description, setDescription] = useState("");

  // const { weeklyCategoryList, monthlyCategoryList } = useSelector(
  //   (state: RootState) => state.HomeSlice
  // );

  useEffect(() => {
    log.info(routeParams);
    if (routeParams?.type === "EDIT_TRANSACTION") {
      setSpentDate(new Date(routeParams?.date as string));
      fetchCategoryList(
        new Date(routeParams?.date as string),
        routeParams?.budgetId as string
      );
      setDescription(routeParams?.description as string);
    } else {
      fetchCategoryList(spentDate, routeParams?.budgetId as string);
    }
  }, []);

  const [weeklyCategoryList, setWeeklyCategoryList] =
    useState<ICategoryBudget[]>();
  const [monthlyCategoryList, setMonthlyCategoryList] =
    useState<ICategoryBudget[]>();

  const toast = useToast();

  const fetchCategoryList = async (date: Date, budgetId?: string) => {
    dispatch(enableLoading());
    const currentWeek = getCurrentWeekRange(date);
    const currentMonth = getCurrentMonthRange(date);
    const [weeklyCategoryResponse, monthlyCategoryResponse] =
      await Promise.allSettled([
        getCurrentWeekBudgetV2({
          ...currentWeek,
        }),
        getCurrentMonthBudgetV2({
          ...currentMonth,
        }),
      ]);

    if (
      weeklyCategoryResponse?.status === "fulfilled" &&
      weeklyCategoryResponse?.value?.error === null
    ) {
      setWeeklyCategoryList(
        weeklyCategoryResponse?.value?.response as ICategoryBudget[]
      );

      budgetId &&
        weeklyCategoryResponse?.value?.response?.map((data) => {
          if (data?.id == parseInt(budgetId)) setSelectedCategory(data);
        });
    }
    if (
      monthlyCategoryResponse?.status === "fulfilled" &&
      monthlyCategoryResponse?.value?.error === null
    ) {
      setMonthlyCategoryList(
        monthlyCategoryResponse?.value?.response as ICategoryBudget[]
      );

      budgetId &&
        monthlyCategoryResponse?.value?.response?.map((data) => {
          if (data?.id == parseInt(budgetId)) setSelectedCategory(data);
        });
    }

    dispatch(disableLoading());
  };

  const confirmDateRange = (date: any) => {
    setIsDateRangeVisible(false);
    setSpentDate(new Date(date?.dateString));
    fetchCategoryList(new Date(date?.dateString));
    setSelectedCategory(null);
  };

  const addTransaction = async () => {
    try {
      if (!selectedCategory) {
        toast.show("Please Select a Category", { type: "danger" });
        return;
      }
      dispatch(enableLoading());
      const payload: any = {
        category_id: selectedCategory?.category_id,
        description: description,
        date: formatDateTimeTimezone(spentDate, "YYYY-MM-DD"),
        amount: parseFloat(routeParams?.amount as string),
        user_id: store.getState().AuthSlice.userDetails?.user_id,
        category_type: selectedCategory?.category_type,
      };
      console.log(payload);
      if (routeParams?.type === "EDIT_TRANSACTION") {
        const { data, error } = await supabase
          .from("transactions")
          .update(payload)
          .eq("id", routeParams?.id);
        console.log(error, data);
        if (error === null) {
          await fetchHomeDataV2(false);
          router.replace("/(tabs)/");
        }
        return;
      }

      const { data, error } = await supabase
        .from("transactions")
        .insert(payload);
      if (error === null) {
        await fetchHomeDataV2(false);
        router.replace("/(tabs)/");
      }

      console.log(error);
    } catch (error) {
    } finally {
      dispatch(disableLoading());
    }
  };

  return (
    <View
      style={{
        flex: 1,
        paddingTop: top,
        backgroundColor: Colors[colorScheme ?? "light"].background,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 16,
          position: "relative",
        }}
      >
        <Pressable
          onPress={() => {
            router.back();
          }}
          style={{ position: "absolute", left: 10, zIndex: 20 }}
        >
          <AntDesign
            name="left"
            size={24}
            color={Colors[colorScheme ?? "light"].darkText}
          />
        </Pressable>
        <View style={{ flex: 2, alignItems: "center" }}>
          <Text
            style={[
              textStyles.bolder,
              textStyles.lg,
              { color: Colors[colorScheme ?? "light"].darkText },
            ]}
          >
            {formatPrice().format(
              parseFloat((routeParams?.amount as string) ?? 0)
            )}
          </Text>
        </View>
        <View style={{ position: "absolute", right: 10 }}>
          <CustomButton
            label={
              routeParams?.type === "EDIT_TRANSACTION" ? "Update" : "Spend"
            }
            colorType="primary"
            onPress={addTransaction}
            customStyle={{
              borderRadius: 25,
              padding: 5,
              paddingHorizontal: 10,
            }}
          />
        </View>
      </View>

      <BorderLine />
      <View
        style={[
          commonStyles.alignJustifyCenter,
          { flexDirection: "row", paddingHorizontal: 24, paddingVertical: 14 },
        ]}
      >
        <Text
          style={[
            textStyles.bolder,
            textStyles.sm,
            {
              paddingRight: 20,
              width: 64,
              color: Colors[colorScheme ?? "light"].darkText,
            },
          ]}
        >
          For
        </Text>
        <TextInput
          value={description}
          placeholder="What did you Spend For"
          style={{ flex: 1 }}
          onChangeText={setDescription}
        />
      </View>
      <View
        style={[
          commonStyles.alignJustifyCenter,
          { flexDirection: "row", paddingHorizontal: 24, paddingVertical: 14 },
        ]}
      >
        <Text
          style={[
            textStyles.bolder,
            textStyles.sm,
            {
              paddingRight: 20,
              width: 64,
              color: Colors[colorScheme ?? "light"].darkText,
            },
          ]}
        >
          Date
        </Text>
        <Pressable
          style={[
            {
              paddingRight: 20,
              flex: 1,
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
            },
          ]}
          onPress={() => {
            setIsDateRangeVisible(true);
          }}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={Colors[colorScheme ?? "light"].gray}
          />
          <Text
            style={[
              textStyles?.sm,
              textStyles?.mdBold,
              { color: Colors[colorScheme ?? "light"]?.gray },
            ]}
          >
            {spentDate
              ? formatDateTimeTimezone(spentDate, "MMM DD,YYYY (ddd)")
              : "Today"}
          </Text>
        </Pressable>
      </View>
      <BorderLine />
      <ScrollView bounces={false}>
        <View
          style={[
            {
              backgroundColor: Colors[colorScheme ?? "light"].lightText,
              padding: 10,
            },
          ]}
        >
          <Text
            style={[
              textStyles.bolder,
              textStyles.sm,
              {
                paddingLeft: 3,
                paddingTop: 2,
                color: Colors[colorScheme ?? "light"].darkText,
              },
            ]}
          >
            Weekly Categories
          </Text>
        </View>
        <View>
          {weeklyCategoryList?.map((data) => {
            return (
              <View
                key={data?.category_id}
                style={[
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    gap: 10,
                  },
                ]}
              >
                <CategoryList
                  data={data}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                />
              </View>
            );
          })}
        </View>
        <View
          style={[
            {
              backgroundColor: Colors[colorScheme ?? "light"].lightText,
              padding: 10,
            },
          ]}
        >
          <Text
            style={[
              textStyles.bolder,
              textStyles.sm,
              {
                paddingLeft: 3,
                paddingTop: 2,
                color: Colors[colorScheme ?? "light"].darkText,
              },
            ]}
          >
            Monthly Categories
          </Text>
        </View>
        <View>
          {monthlyCategoryList?.map((data) => {
            return (
              <View
                key={data?.category_id}
                style={[
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    gap: 10,
                  },
                ]}
              >
                <CategoryList
                  data={data}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
      {isDateRangeVisible && (
        <DateRangePicker
          isVisible={isDateRangeVisible}
          onCancel={() => setIsDateRangeVisible(false)}
          mode="single"
          onConfirm={confirmDateRange}
          dateRange={{ startDate: new Date(spentDate) }}
        />
      )}
    </View>
  );
};

export default ConfirmTransaction;

export const CategoryList = ({
  data,
  selectedCategory,
  setSelectedCategory,
}: {
  data: ICategoryBudget;
  selectedCategory: ICategoryBudget | null;
  setSelectedCategory: (value: ICategoryBudget) => void;
}) => {
  const colorScheme = useColorScheme();
  return (
    <>
      <Pressable
        onPress={() => {
          setSelectedCategory(data);
        }}
        style={[
          commonStyles.alignJustifyCenter,
          { flexDirection: "row", flex: 1 },
        ]}
      >
        <View
          style={[
            commonStyles.alignJustifyCenter,
            {
              backgroundColor:
                data?.category?.background_color || Colors.dark.primary,
              borderRadius: 100,
              aspectRatio: 1,
              height: 40,
            },
          ]}
        >
          <Text style={[textStyles.xl, { paddingLeft: 3, paddingTop: 2 }]}>
            {data?.category?.icon}
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
          <Text
            style={[
              textStyles.bolder,
              textStyles.sm,
              {
                color: Colors[colorScheme ?? "light"].darkText,
                maxWidth: "60%",
              },
            ]}
          >
            {data?.category?.category_name}
          </Text>
          <View
            style={{
              backgroundColor:
                data?.amountSpent > data?.amount
                  ? Colors.light.lightRed
                  : data?.amount / 2 < data?.amountSpent
                  ? Colors.light.lightOrange
                  : Colors.light.lightGreen,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 10,
              height: 24,
            }}
          >
            <Text
              style={[
                textStyles.semiBold,
                textStyles.xs,
                {
                  color:
                    data?.amountSpent > data?.amount
                      ? Colors.light.darkRed
                      : data?.amount / 2 < data?.amountSpent
                      ? Colors.light.darkOrange
                      : Colors.light.darkGreen,
                },
              ]}
              adjustsFontSizeToFit={true}
              numberOfLines={1}
            >
              {formatPrice().format(data?.amount - data?.amountSpent || 0)}
            </Text>
          </View>
        </View>
        <Checkbox
          style={{ margin: 8, borderRadius: 100, width: 20, aspectRatio: 1 }}
          value={data?.category_id == selectedCategory?.category_id}
          onValueChange={() => {
            setSelectedCategory(data);
          }}
          color={
            data?.category_id == selectedCategory?.category_id
              ? Colors[colorScheme ?? "light"].primary
              : undefined
          }
        />
      </Pressable>
    </>
  );
};

const styles = StyleSheet.create({});
