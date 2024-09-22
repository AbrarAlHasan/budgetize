import { Image, StyleSheet, Text, useColorScheme, View } from "react-native";
import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";
import ComingSoon from "@/components/ComingSoon";
import ComingSoonTransaction from "@/components/Transactions/ComingSoonTransaction";

const Transactions = () => {
  const colorScheme = useColorScheme();
  return (
    <>
      {/* <View
        style={{
          backgroundColor: Colors[colorScheme ?? "light"].background,
          flex: 1,
          paddingHorizontal: 10,
        }}
      >
        <View style={[{ flexDirection: "row", alignItems: "center", gap: 10 }]}>
          <Ionicons
            name="caret-back-sharp"
            size={24}
            color={Colors[colorScheme ?? "light"].primary}
          />
          <Text style={[textStyles.semiBold, textStyles.md]}>
            Sep 15 - Sep 21, 2024
          </Text>
          <Ionicons
            name="caret-forward-sharp"
            size={24}
            color={Colors[colorScheme ?? "light"].primary}
          />
        </View>
      </View> */}

      <ComingSoon renderBackground={() => <ComingSoonTransaction />} />
    </>
  );
};

export default Transactions;

const styles = StyleSheet.create({});
