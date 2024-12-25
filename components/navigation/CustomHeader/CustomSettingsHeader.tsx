import { StyleSheet, Text, useColorScheme, View } from "react-native";
import React from "react";
import {
  SafeAreaInsetsContext,
  SafeAreaView,
} from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { header } from "@/stylings/CustomStyles";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";

const CustomSettingsHeader = () => {
  const colorScheme = useColorScheme();
  return (
    <SafeAreaView
      style={[
        header.headerLayout,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
    >
      <ThemedText
        style={[
          header.headerText,
          { color: Colors[colorScheme ?? "light"].darkText },
        ]}
        type="defaultSemiBold"
      >
        Settings
      </ThemedText>
    </SafeAreaView>
  );
};

export default CustomSettingsHeader;

const styles = StyleSheet.create({});
