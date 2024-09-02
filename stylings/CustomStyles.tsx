import { StyleSheet } from "react-native";

const header = StyleSheet.create({
  headerLayout: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:'space-between',
    paddingTop: 10,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
  },
});

export { header };
