import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Colors } from "@/constants/Colors";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";
import {
  ICategory,
  ICategoryBudget,
  ITransaction,
} from "@/types/HomeScreenTypes";
import { formatPrice } from "@/utils/PriceFormatter";
import { supabase } from "@/lib/supabase";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setWeeklyCategories } from "@/redux/reducers/slice/homeSlice";
import { formatDateTimeTimezone } from "@/utils/DateCalculator";
import { router } from "expo-router";

const CategoryBudget = ({
  data,
  type,
  idx,
}: {
  data: ICategoryBudget;
  type: "MONTHLY" | "WEEKLY";
  idx: number;
}) => {
  const colorScheme = useColorScheme();

  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    // setTotalSpent(
    //   data?.transactions?.reduce((acc, curr) => acc + curr.amount, 0)
    // );
  }, [data]);

  const navigateToTransactions = () => {
    router.navigate({
      pathname: "/(stack)/transactions",
      params: { category_id: data?.category_id, type: type },
    });
  };

  return (
    <Pressable style={{ width: "100%" }} onPress={navigateToTransactions}>
      <View
        style={{
          width: "100%",
          padding: 10,
          height: 64,
          flexDirection: "row",
          gap: 4,
          alignItems: "center",
        }}
      >
        <View
          style={[
            { gap: 8, flex: 2, flexDirection: "row", alignItems: "center" },
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
                height: 32,
              },
            ]}
          >
            <Text style={[textStyles.sm, { paddingLeft: 3, paddingTop: 2 }]}>
              {data?.category?.icon}
            </Text>
          </View>
          <Text
            style={[
              textStyles.semiBold,
              textStyles.xs,
              { color: Colors[colorScheme ?? "light"].darkText },
            ]}
          >
            {data?.category?.category_name}
          </Text>
        </View>

        <View style={{ gap: 5, flex: 1 }}>
          <Text
            adjustsFontSizeToFit={true}
            style={[
              textStyles.semiBold,
              textStyles.xs,
              { color: Colors[colorScheme ?? "light"].darkText },
            ]}
            numberOfLines={1}
          >
            {formatPrice().format(data?.amount || 0)}
          </Text>
        </View>

        <View
          style={{
            gap: 5,
            flex: 1,
            alignItems: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor:
                data?.amountSpent > data?.amount
                  ? Colors.light.lightRed
                  : data?.amount / 2 < data?.amountSpent
                  ? Colors.light.lightOrange
                  : Colors.light.lightGreen,
              borderRadius: 20,
              width: "100%",
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
      </View>
    </Pressable>
  );
};

export default CategoryBudget;

const styles = StyleSheet.create({});
