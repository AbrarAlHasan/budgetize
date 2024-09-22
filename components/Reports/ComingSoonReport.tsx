import { Image, StyleSheet, Text, useColorScheme, View } from "react-native";
import React from "react";
import PieChartDummy from "@/assets/images/dummy-pie-chart.jpg";
import BarChartDummy from "@/assets/images/dummy-bar-chart.jpg";
import ComingSoon from "@/assets/images/coming-soon.png";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";
import { BlurView } from "expo-blur";

const ComingSoonReport = () => {
  const colorScheme = useColorScheme();
  return (
    <>
      <Image
        source={require("../../assets/images/dummy-bar-chart.png")}
        style={{ width: "90%" }}
      />
      <Image
        source={require("../../assets/images/dummy-pie-chart.png")}
        style={{ width: "90%" }}
      />
    </>
  );
};

export default ComingSoonReport;

const styles = StyleSheet.create({});
