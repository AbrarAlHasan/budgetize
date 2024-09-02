import { StyleSheet, Text, useColorScheme, View } from "react-native";
import React from "react";
import { Colors } from "@/constants/Colors";
import { textStyles } from "@/stylings/CustomStyles";
import { formatPrice } from "@/utils/PriceFormatter";
import { diffInDays } from "@/utils/DateCalculator";

interface IHeaderSpending {
  label: string;
  leftOverDays: number;
  budgeted: number;
  left: number;
  fromDate: Date;
  toDate: Date;
}

const Header = ({
  label,
  leftOverDays,
  budgeted,
  left,
  fromDate,
  toDate,
}: IHeaderSpending) => {
  const colorScheme = useColorScheme();

  return (
    <View
      style={{
        width: "100%",
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: Colors[colorScheme ?? "light"].lightGray,
        height: 64,
        flexDirection: "row",
        gap: 4,
      }}
    >
      <View style={{ gap: 5, flex: 2 }}>
        <Text style={{ color: Colors[colorScheme ?? "light"].gray }}>
          {label}
        </Text>
        <Text style={[textStyles.semiBold]}>
          {diffInDays(fromDate, toDate)}
        </Text>
      </View>

      <View style={{ gap: 5, flex: 1 }}>
        <Text style={{ color: Colors[colorScheme ?? "light"].gray }}>
          Budgeted
        </Text>
        <Text style={[textStyles.semiBold]}>
          {formatPrice().format(budgeted)}
        </Text>
      </View>

      <View style={{ gap: 5, flex: 1, alignItems: "flex-end" }}>
        <Text style={{ color: Colors[colorScheme ?? "light"].gray }}>Left</Text>
        <Text style={[textStyles.semiBold]}>{formatPrice().format(left)}</Text>
      </View>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({});
