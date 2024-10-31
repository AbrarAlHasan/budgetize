import {
  Pressable,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  useColorScheme,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";
import React from "react";
import { textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";

const ChipText = ({
  chipViewStyle,
  chipTextStyle,
  chipText,
  onPress,
}: {
  chipViewStyle?: ViewStyle;
  chipTextStyle?: TextStyle;
  chipText: string;
  onPress?: () => void;
}) => {
  const colorScheme = useColorScheme();
  return (
    <Pressable
      style={{
        alignItems: "flex-start",
      }}
      onPress={onPress}
    >
      <View
        style={{
          backgroundColor: Colors[colorScheme ?? "light"].lightGreen,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 10,
          height: 24,
          ...chipViewStyle,
        }}
      >
        <Text
          style={[
            textStyles.semiBold,
            textStyles.xs,
            {
              color: Colors[colorScheme ?? "light"].darkGreen,
              ...chipTextStyle,
            },
          ]}
          adjustsFontSizeToFit={true}
          numberOfLines={1}
        >
          {chipText}
        </Text>
      </View>
    </Pressable>
  );
};

export default ChipText;

const styles = StyleSheet.create({});
