import { StyleSheet, Text, useColorScheme, View } from "react-native";
import React from "react";
import { Colors } from "@/constants/Colors";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";

const CategoryBudget = () => {
  const colorScheme = useColorScheme();
  return (
    <View
      style={{
        width: "100%",
        padding: 10,
        height: 64,
        flexDirection: "row",
        gap: 4,
        alignItems: "center",
      }}
    >
      <View
        style={[
          { gap: 8, flex: 2, flexDirection: "row", alignItems: "center" },
        ]}
      >
        <View
          style={[
            commonStyles.alignJustifyCenter,
            {
              backgroundColor: Colors[colorScheme ?? "light"].primary,
              borderRadius: 100,
              aspectRatio: 1,
              height: 32,
            },
          ]}
        >
          <Text style={[textStyles.sm, { paddingLeft: 3, paddingTop: 2 }]}>
            😀
          </Text>
        </View>
        <Text style={[textStyles.bolder, textStyles.sm]}>Coffee Shop</Text>
      </View>

      <View style={{ gap: 5, flex: 1 }}>
        <Text style={[textStyles.bolder, textStyles.sm]}>2,546,65</Text>
      </View>

      <View style={{ gap: 5, flex: 1, alignItems: "flex-end" }}>
        <Text style={[textStyles.bolder, textStyles.sm]}>34,345</Text>
      </View>
    </View>
  );
};

export default CategoryBudget;

const styles = StyleSheet.create({});
