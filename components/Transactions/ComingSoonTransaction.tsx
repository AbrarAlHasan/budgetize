import { StyleSheet, Text, useColorScheme, View } from "react-native";
import React from "react";
import { Image } from "expo-image";
import { Colors } from "@/constants/Colors";
import { textStyles } from "@/stylings/CustomStyles";
import { formatPrice } from "@/utils/PriceFormatter";
import CategoryBudget from "../HomeScreen/CategoryBudget";
import { ICategory } from "@/types/HomeScreenTypes";

const data = [
  {
    amount: 90,
    category_id: 46,
    created_at: "2024-09-21T18:05:00.990348+00:00",
    date: "2024-09-21",
    description: "Dinner - Juice and Bread Omelete",
    id: 18,
    user_id: "43d41ecd-d8c4-4d82-9969-20b7e7a0fae9",
  },
];

const newData: Array<ICategory> = [
  {
    amount_allocated: 350,
    background_color: "#BDB76B",
    category_id: 44,
    category_name: "BreakFast",
    created_at: "2024-09-21T09:25:37.264297+00:00",
    from_date: "2024-09-01",
    icon: "🍞",
    to_date: null,
    transactions: [],
    type: "WEEKLY",
    user_id: "43d41ecd-d8c4-4d82-9969-20b7e7a0fae9",
  },
  {
    amount_allocated: 1400,
    background_color: "#008080",
    category_id: 45,
    category_name: "Lunch",
    created_at: "2024-09-21T09:28:53.061413+00:00",
    from_date: "2024-09-01",
    icon: "🍚",
    to_date: null,
    transactions: [],
    type: "WEEKLY",
    user_id: "43d41ecd-d8c4-4d82-9969-20b7e7a0fae9",
  },
  {
    amount_allocated: 700,
    background_color: "#000080",
    category_id: 46,
    category_name: "Dinner",
    created_at: "2024-09-21T09:30:40.144297+00:00",
    from_date: "2024-09-01",
    icon: "🍽️",
    to_date: null,
    transactions: [],
    type: "WEEKLY",
    user_id: "43d41ecd-d8c4-4d82-9969-20b7e7a0fae9",
  },
];

const ComingSoonTransaction = () => {
  const colorScheme = useColorScheme();
  return (
    <>
      {newData?.map((data, idx) => (
        <CategoryBudget
          key={data?.category_id}
          data={data}
          type="WEEKLY"
          idx={idx}
        />
      ))}

      {newData?.map((data, idx) => (
        <CategoryBudget
          key={data?.category_id}
          data={data}
          type="WEEKLY"
          idx={idx}
        />
      ))}

      {newData?.map((data, idx) => (
        <CategoryBudget
          key={data?.category_id}
          data={data}
          type="WEEKLY"
          idx={idx}
        />
      ))}
      {newData?.map((data, idx) => (
        <CategoryBudget
          key={data?.category_id}
          data={data}
          type="WEEKLY"
          idx={idx}
        />
      ))}
    </>
  );
};

export default ComingSoonTransaction;

const styles = StyleSheet.create({});
