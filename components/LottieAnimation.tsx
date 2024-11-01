import { Platform, StyleSheet, Text, View } from "react-native";
import React, { LegacyRef, useEffect, useRef } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import LottieView from "lottie-react-native";

const LottieAnimation = ({ src, style, type }: any) => {
  const loadingRef = useRef<LottieView | undefined>();
  useEffect(() => {
    if (type === "loader") loadingRef.current?.play(25, 72);
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
          source={src}
        />
      )}
    </>
  );
};

export default LottieAnimation;

const styles = StyleSheet.create({});
