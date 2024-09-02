import { Image, StyleSheet, Text, useColorScheme, View } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { header } from "@/stylings/CustomStyles";
import { ThemedText } from "@/components/ThemedText";

import { Colors } from "@/constants/Colors";
const CustomHomeHeader = () => {
  const colorScheme = useColorScheme();
  return (
    <SafeAreaView style={header.headerLayout}>
      {/* <Image
        source={AppIcon}
        style={{ width: 64, height: 40, resizeMode: "contain" }}
      /> */}
      <FontAwesome6
        name="business-time"
        size={24}
        color={Colors[colorScheme ?? "light"].primary}
      />
      <ThemedText style={header.headerText}>Home</ThemedText>
      <FontAwesome6
        name="edit"
        size={24}
        color={Colors[colorScheme ?? "light"].primary}
      />
    </SafeAreaView>
  );
};

export default CustomHomeHeader;

const styles = StyleSheet.create({});
