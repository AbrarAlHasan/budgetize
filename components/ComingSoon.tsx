import { StyleSheet, Text, useColorScheme, View } from "react-native";
import React, { ReactElement } from "react";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { Colors } from "@/constants/Colors";
import { commonStyles } from "@/stylings/CustomStyles";

const ComingSoon = ({
  renderBackground = () => <></>,
}: {
  renderBackground: () => ReactElement;
}) => {
  const colorScheme = useColorScheme();

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: Colors[colorScheme ?? "light"].lightGray,
          alignItems: "center",
        },
      ]}
    >
      {renderBackground()}
      <BlurView
        intensity={25}
        style={[
          commonStyles.alignJustifyCenter,
          { flex: 1, position: "absolute", width: "100%", height: "100%" },
        ]}
      >
        <Image
          source={require("../assets/images/under-construction.png")}
          style={{ width: 500, aspectRatio: 1 }}
        />
      </BlurView>
    </View>
  );
};

export default ComingSoon;

const styles = StyleSheet.create({});
