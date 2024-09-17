import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import AntDesign from "@expo/vector-icons/AntDesign";
import CustomButton from "@/components/CustomButton";
import { commonStyles } from "@/stylings/CustomStyles";
import { router } from "expo-router";
const keyBoardValues = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"];
const AddTransaction = () => {
  const colorScheme = useColorScheme();

  const [amount, setAmount] = useState("0");

  const handlePress = (value: string) => {
    if (value === "." && amount.includes(".")) {
      // Prevent adding more than one decimal point
      return;
    }

    if (amount === "0" && value !== ".") {
      setAmount(value);
    } else {
      setAmount(amount + value);
    }
  };

  // Function to handle backspace
  const handleBackspace = () => {
    setAmount(amount.slice(0, -1) || "0");
  };
  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
    >
      <Pressable
        style={{
          alignItems: "flex-end",
        }}
        onPress={() => router.back()}
      >
        <AntDesign
          name="close"
          size={24}
          color={Colors[colorScheme ?? "light"].darkText}
        />
      </Pressable>
      <View
        style={[
          styles.amountContainer,
          commonStyles.alignJustifyCenter,
          { width: "100%" },
        ]}
      >
        <Text
          style={[
            styles.amountText,
            {
              color:
                amount === "0"
                  ? Colors[colorScheme ?? "light"].lightGray
                  : Colors[colorScheme ?? "light"].primary,
            },
          ]}
        >{`₹${amount}`}</Text>
      </View>
      <View style={[styles.keypadContainer]}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((key) => (
          <TouchableOpacity
            key={key}
            style={styles.key}
            onPress={() => handlePress(key)}
          >
            <Text
              style={[
                styles.keyText,
                { color: Colors[colorScheme ?? "light"].darkText },
              ]}
            >
              {key}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.key} onPress={handleBackspace}>
          <Text
            style={[
              styles.keyText,
              { color: Colors[colorScheme ?? "light"].darkText },
            ]}
          >
            ⌫
          </Text>
        </TouchableOpacity>
      </View>
      <CustomButton
        label="Continue"
        colorType="primary"
        onPress={() => {
          router.navigate({
            pathname: "/(stack)/confirmTransaction",
            params: { amount },
          });
        }}
      />
    </SafeAreaView>
  );
};

export default AddTransaction;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  amountContainer: {
    flex: 1,
    justifyContent: "center",
  },
  amountText: {
    fontSize: 48,
    fontWeight: "bold",
  },
  keypadContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    flex: 1,
  },
  key: {
    width: "30%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
  },
  keyText: {
    fontSize: 24,
  },
  continueButton: {
    width: "80%",
    padding: 15,

    borderRadius: 10,
    marginBottom: 20,
  },
  continueText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
});
