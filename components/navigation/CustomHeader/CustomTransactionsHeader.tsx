import { StyleSheet, Text, useColorScheme, View } from "react-native";
import React from "react";
import {
  SafeAreaInsetsContext,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { header } from "@/stylings/CustomStyles";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";

const CustomTransactionsHeader = () => {
  const colorScheme = useColorScheme();
  const { top } = useSafeAreaInsets();
  return (
    <SafeAreaView
      style={[
        header.headerLayout,
        {
          backgroundColor: Colors[colorScheme ?? "light"].background,
          paddingTop: 0,
        },
      ]}
    >
      <ThemedText style={header.headerText} type="defaultSemiBold">
        Transactions
      </ThemedText>
    </SafeAreaView>
  );
};

export default CustomTransactionsHeader;

const styles = StyleSheet.create({});
