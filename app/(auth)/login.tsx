import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import React, { useState } from "react";
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

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const colorScheme = useColorScheme();

  const [email, setEmail] = useState("abraralhasan111@gmail.com");
  const [password, setPassword] = useState("Abrar@1998");

  const dispatch = useDispatch();

  const onSignInClicked = async () => {
    try {
      setIsLoading(true);
      Keyboard.dismiss();
      const { data, error }: { data: any; error: any } = await initiateLogin(
        email,
        password
      );

      if (error === null) {
        const { data, error } = await supabase
          .from("users")
          .select()
          .eq("email", "abraralhasan111@gmail.com")
          .limit(1)
          .maybeSingle();


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
        toast.show(error?.message);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[
        { flex: 1, backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
    >
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({});
