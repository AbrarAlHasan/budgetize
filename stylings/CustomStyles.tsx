import { StyleSheet } from "react-native";

const header = StyleSheet.create({
  headerLayout: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
  },
});

const commonStyles = StyleSheet.create({
  alignJustifyCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  alignJustifyBetween: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  alignJustifyAround: {
    alignItems: "center",
    justifyContent: "space-around",
  },
});

const textStyles = StyleSheet.create({
  bolder: {
    fontWeight: "bold",
  },
  semiBold: {
    fontWeight: "600",
  },

  mdBold: {
    fontWeight: "500",
  },
  xxxl: {
    fontSize: 32,
  },
  xl: {
    fontSize: 24,
  },
  lg: {
    fontSize: 20,
  },
  md: {
    fontSize: 18,
  },
  sm: {
    fontSize: 16,
  },
  xs: {
    fontSize: 14,
  },
  xxs: {
    fontSize: 12,
  },
});

export { header, commonStyles, textStyles };
