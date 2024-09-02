import { StyleSheet, Text, View } from "react-native";
import React from "react";
import {
  SafeAreaInsetsContext,
  SafeAreaView,
} from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { header } from "@/stylings/CustomStyles";
import { ThemedText } from "@/components/ThemedText";

const CustomSettingsHeader = () => {
  return (
    <SafeAreaView style={header.headerLayout}>
      <ThemedText style={header.headerText} type="defaultSemiBold">
        Settings
      </ThemedText>
    </SafeAreaView>
  );
};

export default CustomSettingsHeader;

const styles = StyleSheet.create({});
