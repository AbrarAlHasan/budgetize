import { Platform, StyleSheet, Text, View } from "react-native";
import React, { LegacyRef, useEffect, useRef } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import LottieView from "lottie-react-native";

const LottieAnimation = ({ src, style }: any) => {
  const animationSource = Platform.OS === "web" ? src : requireAnimation(src);
  const loadingRef = useRef<LottieView | undefined>();
  useEffect(() => {
    loadingRef.current?.play(25, 72);
  }, []);
  return (
    <>
      {Platform.OS === "web" ? (
        <DotLottieReact
          autoplay={true}
          style={{
            width: 300,
            height: 300,
            ...style,
          }}
          src={src}
          loop={true}
        />
      ) : (
        <LottieView
          ref={loadingRef}
          autoPlay
          style={{
            width: 300,
            height: 300,
            ...style,
          }}
          source={animationSource}
        />
      )}
    </>
  );
};

export default LottieAnimation;

const styles = StyleSheet.create({});

function requireAnimation(src: string) {
  switch (src) {
    case "budget":
      return require("@/assets/gifs/Budget.json");
    // Add more cases for other static animation files

    case "loader":
      return require("@/assets/gifs/Loading.json");
    default:
      throw new Error(`Unknown animation source: ${src}`);
  }
}
