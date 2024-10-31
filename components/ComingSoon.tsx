import { Platform, StyleSheet, Text, useColorScheme, View } from "react-native";
import React, { ReactElement } from "react";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { Colors } from "@/constants/Colors";
import { commonStyles } from "@/stylings/CustomStyles";
import LottieView from "lottie-react-native";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

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
          backgroundColor: Colors[colorScheme ?? "light"].background,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      {/* {renderBackground()} */}
      {/* <BlurView
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
      </BlurView> */}

      {Platform.OS === "web" ? (
        <DotLottieReact
          autoplay={true}
          style={{
            width: 400,
            aspectRatio: 1,
          }}
          src={"../../assets/gifs/UnderDevelopment.json"}
          loop={true}
        />
      ) : (
        <LottieView
          autoPlay
          style={{
            width: 400,
            aspectRatio: 1,
          }}
          source={require("@/assets/gifs/UnderDevelopment.json")}
        />
      )}
      {/* <LottieView
        autoPlay
        style={{
          width: 400,
          aspectRatio: 1,
        }}
        source={require("@/assets/gifs/UnderDevelopment.json")}
      /> */}
    </View>
  );
};

export default ComingSoon;

const styles = StyleSheet.create({});
