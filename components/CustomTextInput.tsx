import {
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import React, { Dispatch, SetStateAction } from "react";
import { textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";

interface ICustomTextInput {
  label: string;
  placeholder: string;
  type?: "password" | "normal" | "settings";
  onChangeText: Dispatch<SetStateAction<any>>;
  value: string | undefined;
  showLabel?: boolean;
  onFocus?: () => void;
}

const CustomTextInput = ({
  label,
  placeholder,
  type = "normal",
  onChangeText,
  value,
  showLabel = true,
  onFocus = () => {},
}: ICustomTextInput) => {
  const colorScheme = useColorScheme();

  return (
    <View style={{ width: "100%", gap: 12, marginVertical: 10 }}>
      {showLabel && (
        <Text
          style={[
            textStyles.semiBold,
            textStyles.md,
            { color: Colors[colorScheme ?? "light"].darkText },
          ]}
        >
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={{
          backgroundColor: Colors[colorScheme ?? "light"].lightGray,
          padding: 18,
          borderRadius: 14,
        }}
        placeholder={placeholder}
        autoCapitalize="none"
        placeholderTextColor={Colors[colorScheme ?? "light"].darkText}
        onFocus={onFocus}
      />
    </View>
  );
};

export default CustomTextInput;

const styles = StyleSheet.create({});
