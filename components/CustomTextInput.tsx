import {
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import React from "react";
import { textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";

interface ICustomTextInput {
  label: string;
  placeholder: string;
  type?: "password" | "normal";
}

const CustomTextInput = ({
  label,
  placeholder,
  type = "normal",
}: ICustomTextInput) => {
  const colorScheme = useColorScheme();
  return (
    <View style={{ width: "100%", gap: 12 }}>
      <Text style={[textStyles.semiBold, textStyles.md]}>{label}</Text>
      <TextInput
        style={{
          backgroundColor: Colors[colorScheme ?? "light"].lightGray,
          padding: 18,
          borderRadius: 14,
        }}
        placeholder={placeholder}
        autoCapitalize="none"
      />
    </View>
  );
};

export default CustomTextInput;

const styles = StyleSheet.create({});
