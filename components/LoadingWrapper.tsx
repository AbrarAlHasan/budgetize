import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import React, { ReactElement, useCallback, useEffect, useRef } from "react";

import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import LottieView from "lottie-react-native";
import { useFocusEffect } from "expo-router";

const LoadingWrapper = ({
  children,
  renderOnlyLoading,
}: {
  children?: ReactElement;
  renderOnlyLoading?: boolean;
}) => {
  const { height, width } = useWindowDimensions();

  const isLoading = useSelector(
    (state: RootState) => state.GlobalSlice.isLoading
  );

  const loadingRef = useRef<LottieView | undefined>();

  useFocusEffect(
    useCallback(() => {
      loadingRef.current?.play(29, 72);

      return () => {};
    }, [isLoading])
  );

  const LoadingComponent = () => {
    return (
      <>
        <View
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#000",
            opacity: 0.4,
            zIndex: 9999, // Set a very high z-index
            elevation: 9999, // Android-specific layering
            position: "absolute",
          }}
        ></View>
        <View
          style={{
            position: "absolute",
            zIndex: 10000, // Set a very high z-index
            elevation: 10000, // Android-specific layering
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
    );
  };

  if (renderOnlyLoading) {
    return <>{isLoading && <LoadingComponent />}</>;
  }

  return (
    <>
      {children}
      {isLoading && <LoadingComponent />}
    </>
  );
};

export default LoadingWrapper;

const styles = StyleSheet.create({});
