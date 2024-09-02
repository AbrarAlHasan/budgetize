import { StyleSheet, Text, View } from "react-native";
import React from "react";
import {
  SafeAreaInsetsContext,
  SafeAreaView,
} from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { header } from "@/stylings/CustomStyles";
import { ThemedText } from "@/components/ThemedText";

const CustomReportsHeader = () => {
  return (
    <SafeAreaView style={header.headerLayout}>
      <ThemedText style={header.headerText} type="defaultSemiBold">
        Reports
      </ThemedText>
    </SafeAreaView>
  );
};

export default CustomReportsHeader;

const styles = StyleSheet.create({});
