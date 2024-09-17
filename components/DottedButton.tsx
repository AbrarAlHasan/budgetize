import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import React from "react";
import { Colors } from "@/constants/Colors";
import { commonStyles } from "@/stylings/CustomStyles";

interface IDottedButton {
  label: string;
  onPress: () => void;
}
const DottedButton = ({ label, onPress }: IDottedButton) => {
  const colorScheme = useColorScheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        commonStyles.alignJustifyCenter,
        {
          borderWidth: 1,
          borderColor: Colors[colorScheme ?? "light"].gray,
          borderStyle: "dashed",
          borderRadius: 10,
          marginHorizontal: 20,
          padding: 10,
          marginVertical: 20,
        },
      ]}
    >
      <Text style={{ color: Colors[colorScheme ?? "light"].darkText }}>
        + {label}
      </Text>
    </Pressable>
  );
};

export default DottedButton;

const styles = StyleSheet.create({});
