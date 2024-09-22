import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from "react-native";
import React, { useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";
import CustomTextInput from "@/components/CustomTextInput";
import CustomButton from "@/components/CustomButton";
import { Link, router } from "expo-router";
import { initiateLogin } from "@/api/authentication.action";
import { useToast } from "react-native-toast-notifications";
import { supabase } from "@/lib/supabase";
import { useDispatch } from "react-redux";
import {
  setCheckingAuthentication,
  setUserDetails,
} from "@/redux/reducers/slice/authSlice";
import { Colors } from "@/constants/Colors";

import * as Linking from "expo-linking";
import ResetPasswordModal from "@/components/Settings/ResetPasswordModal";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const colorScheme = useColorScheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const dispatch = useDispatch();

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const validate = () => {
    if (!email?.trim()) {
      toast.show("Please Enter Email", { type: "danger" });
      return false;
    }
    if (!password?.trim()) {
      toast.show("Please Enter Password", { type: "danger" });
      return false;
    }
    return true;
  };

  const onSignInClicked = async () => {
    try {
      if (validate()) {
        setIsLoading(true);
        Keyboard.dismiss();
        const { data: authDetails, error }: { data: any; error: any } =
          await initiateLogin(email, password);
        console.log(authDetails);
        if (error === null) {
          const { data, error } = await supabase
            .from("users")
            .select()
            .eq("email", email)
            .limit(1)
            .maybeSingle();
          console.log(data);
          if (!data?.initial_password_changed) {
            bottomSheetModalRef.current?.present();
            return;
          }
          if (error === null) {
            dispatch(setUserDetails(data));
            dispatch(
              setCheckingAuthentication({
                isAuthenticated: true,
                checkingAuthentication: false,
              })
            );
            router.replace("/(tabs)/");
          }
          if (error?.message) {
            toast.show(error?.message);
          }
        }
        if (error?.message) {
          console.log(error);
          toast.show(error?.message);
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForgetPassword = () => {
    if (!email?.trim()) {
      toast.show("Please Enter Email", { type: "danger" });
      return false;
    }
    return true;
  };

  const onForgotPasswordClick = async () => {
    if (validateForgetPassword()) {
      const response = await supabase.functions.invoke("forgot-password", {
        body: { email: "abraralhasan123@gmail.com" },
      });

      if (response?.data?.error === true) {
        toast.show(response?.data?.message ?? "Something Went Wrong", {
          type: "danger",
        });
        return;
      }
      if (response?.data?.error === false) {
        toast.show(response?.data?.message, { type: "success" });
        return;
      }
    }
  };

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[
        { flex: 1, backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <KeyboardAvoidingView
          style={[
            commonStyles.alignJustifyCenter,
            { flex: 1, padding: 20, gap: 20 },
          ]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Text
            style={[
              textStyles.bolder,
              textStyles.md,
              { color: Colors[colorScheme ?? "light"].darkText },
            ]}
          >
            Welcome Back{" "}
          </Text>
          <View style={{ gap: 20, width: "100%" }}>
            <CustomTextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Your Email"
              label="Email"
            />
            <CustomTextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Your Password"
              label="Password"
              type="password"
            />
          </View>
          <View>
            <CustomButton
              label="Sign In"
              colorType="primary"
              onPress={onSignInClicked}
            />
            <CustomButton
              label="Forgot Password ?"
              colorType="gray"
              onPress={onForgotPasswordClick}
            />
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <ResetPasswordModal
        bottomSheetModalRef={bottomSheetModalRef}
        existingPassword={password}
        email={email}
      />
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({});
