import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";
import CustomTextInput from "@/components/CustomTextInput";
import CustomButton from "@/components/CustomButton";
import { Link } from "expo-router";
import { initiateLogin } from "@/api/authentication.action";
import { useToast } from "react-native-toast-notifications";
import { supabase } from "@/lib/supabase";
import { useDispatch } from "react-redux";
import { setUserDetails } from "@/redux/reducers/slice/authSlice";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const dispatch = useDispatch();

  const onSignInClicked = async () => {
    try {
      setIsLoading(true);
      Keyboard.dismiss();
      const { data, error } = await initiateLogin(
        "abraralhasan111@gmail.com",
        "Abrar@1998"
      );
      console.log(data, error?.message);
      if (error === null) {
        const { data, error } = await supabase
          .from("users")
          .select()
          .eq("email", "abraralhasan111@gmail.com")
          .limit(1)
          .maybeSingle();
        console.log("DB", { data, error });

        if (error === null) {
          dispatch(setUserDetails(data));
        }
        if (error?.message) {
          toast.show(error?.message);
        }
      }
      if (error?.message) {
        toast.show(error?.message);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <SafeAreaView edges={["bottom"]} style={[{ flex: 1 }]}>
      <KeyboardAvoidingView
        style={[
          commonStyles.alignJustifyCenter,
          { flex: 1, padding: 20, gap: 20 },
        ]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={[textStyles.bolder, textStyles.md]}>Welcome Back </Text>
        <View style={{ gap: 20, width: "100%" }}>
          <CustomTextInput placeholder="Your Email" label="Email" />
          <CustomTextInput
            placeholder="Your Password"
            label="Password"
            type="password"
          />
        </View>

        <CustomButton
          label="Sign In"
          colorType="primary"
          onPress={onSignInClicked}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({});
