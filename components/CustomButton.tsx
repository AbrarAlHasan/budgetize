import {
  ColorValue,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  ViewStyle,
} from "react-native";
import React from "react";
import { Colors } from "@/constants/Colors";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";

interface ICustomButton {
  colorType: "primary" | "gray" | "custom";
  customBackgroundColor?: string;
  customTextColor?: string;
  label: string;
  onPress: () => void;
  customStyle?: ViewStyle;
}

const CustomButton = ({
  colorType,
  customBackgroundColor,
  customTextColor,
  label = "Button",
  onPress,
  customStyle,
}: ICustomButton) => {
  const colorscheme = useColorScheme();
  let backgroundColor = Colors[colorscheme ?? "light"].primary;
  let textColor = Colors[colorscheme ?? "light"].lightText;
  if (colorType === "primary") {
    backgroundColor = Colors[colorscheme ?? "light"].primary;
    textColor = Colors[colorscheme ?? "light"].lightText;
  } else if (colorType === "gray") {
    backgroundColor = Colors[colorscheme ?? "light"].lightGray;
    textColor = Colors[colorscheme ?? "light"].darkText;
  } else if (
    colorType === "custom" &&
    customBackgroundColor &&
    customTextColor
  ) {
    backgroundColor = customBackgroundColor;
    textColor = customTextColor;
  }
  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          commonStyles.alignJustifyCenter,
          {
            backgroundColor: backgroundColor,
            width: "100%",
            flexDirection: "row",
            padding: 12,
            borderRadius: 10,
            ...customStyle,
          },
        ]}
      >
        <Text
          style={[textStyles.semiBold, textStyles.md, { color: textColor }]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
};

export default CustomButton;

const styles = StyleSheet.create({});
