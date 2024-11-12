import {
  StyleSheet,
  Text,
  useColorScheme,
  View,
  ViewStyle,
} from "react-native";
import React, { ReactElement } from "react";
import { Colors } from "@/constants/Colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SafeAreaWrapper = ({
  children,
  style,
}: {
  children: ReactElement;
  style?: ViewStyle;
}) => {
  const colorScheme = useColorScheme();
  const { top, bottom } = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        paddingTop: top,
        backgroundColor: Colors[colorScheme ?? "light"].background,
        paddingBottom: bottom,
        ...style,
      }}
    >
      {children}
    </View>
  );
};

export default SafeAreaWrapper;

const styles = StyleSheet.create({});
