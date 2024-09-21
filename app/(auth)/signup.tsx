import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from "react-native";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomTextInput from "@/components/CustomTextInput";
import { Colors } from "@/constants/Colors";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";
import CustomButton from "@/components/CustomButton";
import AppLogo from "../../assets/images/icon.png";
import { useToast } from "react-native-toast-notifications";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";

const Signup = () => {
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const validate = () => {
    if (!name?.trim()) {
      toast.show("Please Enter Name", { type: "danger" });
      return false;
    }
    if (!email?.trim()) {
      toast.show("Please Enter Email", { type: "danger" });
      return false;
    }
    // if (!password.trim()) {
    //   toast.show("Please Enter Password", { type: "danger" });
    //   return false;
    // }
    // if (!confirmPassword.trim()) {
    //   toast.show("Please Re-Enter Confirmation Password", { type: "danger" });
    //   return false;
    // }
    // if (password !== confirmPassword) {
    //   toast.show("Confirm Password and Password is not same. Please Recheck", {
    //     type: "danger",
    //   });
    //   return false;
    // }
    return true;
  };

  const onCreateUser = async () => {
    // const edgeResponse = await supabase.functions.invoke("create-user");
    // console.log({ edgeResponse });
    // return;

    // const response = await supabase.auth.admin.createUser({
    //   email: "abraralhasan123@gmail.com",
    //   password: "Abrar@1234",
    //   email_confirm: true,
    //   user_metadata: { name: "Abrar" },
    // });
    // console.log({ response });
    // return;

    if (validate()) {
      const payload = {
        name: name,
        email: email,
      };
      const existingUser = await supabase
        .from("users")
        .select()
        .eq("email", email);
      const response = await supabase
        .from("account_creation_requests")
        .insert(payload);

      if (response.error === null) {
        const edgeResponse = await supabase.functions.invoke("create-user");
        toast.show(
          "Your Request For Creating Account has been Submitted. You will receive a Mail with temporary Password where you can login and reset the Password in the Settings",
          {
            duration: 5000,
            type: "success",
          }
        );
        router.replace("/(auth)/login");

        return;
      }
      toast.show(response?.error?.details, { type: "danger" });
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            commonStyles.alignJustifyCenter,
            {
              paddingTop: top,
              flex: 1,
              backgroundColor: Colors[colorScheme ?? "light"].background,
              paddingHorizontal: 20,
            },
          ]}
        >
          <Text
            style={[textStyles.semiBold, textStyles.lg, { marginBottom: 20 }]}
          >
            Let's get Started
          </Text>
          <CustomTextInput
            label="Name"
            onChangeText={setName}
            placeholder="Name"
            value={name}
          />
          <CustomTextInput
            label="Email"
            onChangeText={setEmail}
            placeholder="Email"
            value={email}
          />
          {/* <CustomTextInput
            label="Password"
            onChangeText={setPassword}
            placeholder="Password"
            value={password}
          />
          <CustomTextInput
            label="Confirm Password"
            onChangeText={setConfirmPassword}
            placeholder="Confirm Password"
            value={confirmPassword}
          /> */}
          <View style={{ width: "100%", marginVertical: 10 }}>
            <CustomButton
              onPress={onCreateUser}
              label="Create Account"
              colorType="primary"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

export default Signup;

const styles = StyleSheet.create({});
