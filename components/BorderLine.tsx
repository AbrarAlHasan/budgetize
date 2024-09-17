import { StyleSheet, Text, useColorScheme, View } from "react-native";
import React from "react";
import { Colors } from "@/constants/Colors";

const BorderLine = () => {
  const colorScheme = useColorScheme();
  return (
    <View
      style={{
        height: 0.5,
        width: "100%",
        backgroundColor: Colors[colorScheme ?? "light"].gray,
        marginTop: 5,
      }}
    />
  );
};

export default BorderLine;

const styles = StyleSheet.create({});
