import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import AntDesign from "@expo/vector-icons/AntDesign";
import CustomButton from "@/components/CustomButton";
import { commonStyles } from "@/stylings/CustomStyles";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import SafeAreaWrapper from "@/components/SafeAreaWrapper";
import { useDispatch } from "react-redux";
import {
  disableLoading,
  enableLoading,
} from "@/redux/reducers/slice/globalSlice";
import { fetchHomeDataV2 } from "@/api/home.action";
import FloatingButton from "@/components/FloatingButton";
import log from "@/utils/Logger";
const keyBoardValues = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"];
const AddTransaction = () => {
  const colorScheme = useColorScheme();
  const routeParams = useLocalSearchParams();
  const dispatch = useDispatch();

  const [amount, setAmount] = useState("0");

  useEffect(() => {
    if (routeParams?.type === "BUDGET") {
      setAmount(routeParams?.budgetAmount as string);
    }

    if (routeParams?.type === "EDIT_TRANSACTION") {
      setAmount(routeParams?.amount as string);
    }
  }, []);

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

  const onConfirm = () => {
    if (routeParams?.type === "BUDGET") {
      updateBudget();
      return;
    }

    if (routeParams?.type === "EDIT_TRANSACTION") {
      router.navigate({
        pathname: "/(stack)/confirmTransaction",
        params: { ...routeParams, amount },
      });
      return;
    }
    router.navigate({
      pathname: "/(stack)/confirmTransaction",
      params: { amount, budgetId: routeParams?.budgetId },
    });
  };

  const updateBudget = async () => {
    try {
      dispatch(enableLoading());
      const payload = {
        amount: parseInt(amount),
      };
      const response = await supabase
        .from("budget")
        .update(payload)
        .eq("id", routeParams?.budgetId);
      await fetchHomeDataV2();
      if (response?.error === null) {
        router.back();
      }
    } catch (error) {
    } finally {
      dispatch(disableLoading());
    }
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
      <View>
        <View style={{ flexDirection: "row" }}>
          <View style={[styles.keypadContainer, {}]}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map(
              (key) => (
                <TouchableOpacity
                  key={key}
                  style={styles.key}
                  onPress={() => {
                    if (key === "⌫") {
                      handleBackspace();
                    } else {
                      handlePress(key);
                    }
                  }}
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
              )
            )}
          </View>
        </View>

        <View>
          <CustomButton
            label="Continue"
            colorType="primary"
            onPress={() => {
              onConfirm();
            }}
          />
        </View>
      </View>
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
  },
  key: {
    width: "30%",
    // aspectRatio: 1,
    height: Dimensions.get("window").width * 0.2,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
    // backgroundColor: "blue",
    // flex: 1,
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
