import { StyleSheet, Text, View } from "react-native";
import React from "react";
import {
  SafeAreaInsetsContext,
  SafeAreaView,
} from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { header } from "@/stylings/CustomStyles";
import { ThemedText } from "@/components/ThemedText";

const CustomTransactionsHeader = () => {
  return (
    <SafeAreaView style={header.headerLayout}>
      <ThemedText style={header.headerText} type="defaultSemiBold">
        Transactions
      </ThemedText>
    </SafeAreaView>
  );
};

export default CustomTransactionsHeader;

const styles = StyleSheet.create({});
