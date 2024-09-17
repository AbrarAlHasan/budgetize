import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import React from "react";
import AntDesign from "@expo/vector-icons/AntDesign";
import { commonStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";

const FloatingButton = ({ onPress = () => {} }) => {
  const colorScheme = useColorScheme();
  return (
    <Pressable
      style={[
        commonStyles.alignJustifyCenter,
        {
          position: "absolute",
          bottom: 20,
          right: 20,
          backgroundColor: Colors[colorScheme ?? "light"].primary,
          width: 60,
          aspectRatio: 1,
          borderRadius: 100,
          zIndex: 1,
        },
      ]}
      onPress={onPress}
    >
      <AntDesign
        name="plus"
        size={24}
        color={Colors[colorScheme ?? "light"].lightText}
      />
    </Pressable>
  );
};

export default FloatingButton;

const styles = StyleSheet.create({});
