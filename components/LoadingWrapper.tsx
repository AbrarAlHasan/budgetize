import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import React, { ReactElement } from "react";
import LottieAnimation from "./LottieAnimation";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

const LoadingWrapper = ({ children }: any) => {
  const { height, width } = useWindowDimensions();

  const isLoading = useSelector(
    (state: RootState) => state.GlobalSlice.isLoading
  );

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
            <LottieAnimation src="loader" style={{ width: 200, height: 200 }} />
          </View>
        </>
      )}
    </>
  );
};

export default LoadingWrapper;

const styles = StyleSheet.create({});
