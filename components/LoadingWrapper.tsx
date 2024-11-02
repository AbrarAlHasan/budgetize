import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import React, { ReactElement, useEffect, useRef } from "react";

import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import LottieView from "lottie-react-native";

const LoadingWrapper = ({ children }: any) => {
  const { height, width } = useWindowDimensions();

  const isLoading = useSelector(
    (state: RootState) => state.GlobalSlice.isLoading
  );

  const loadingRef = useRef<LottieView | undefined>();

  useEffect(() => {
    loadingRef.current?.play(25, 72);
  }, []);

  return (
    <>
      {children}
      {isLoading && (
        <>
          <View
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#000",
              opacity: 0.4,
              zIndex: 1,
              position: "absolute",
            }}
          ></View>
          <View
            style={{
              position: "absolute",
              zIndex: 5,
              alignItems: "center",
              justifyContent: "center",
              height,
              width,
            }}
          >
            {Platform.OS === "web" ? (
              <DotLottieReact
                autoplay={true}
                style={{
                  width: 200,
                  height: 200,
                }}
                src={"@/assets/gifs/Loading.json"}
                loop={true}
              />
            ) : (
              <LottieView
                ref={loadingRef}
                autoPlay
                style={{
                  width: 200,
                  height: 200,
                }}
                source={require("@/assets/gifs/Loading.json")}
              />
            )}
          </View>
        </>
      )}
    </>
  );
};

export default LoadingWrapper;

const styles = StyleSheet.create({});
