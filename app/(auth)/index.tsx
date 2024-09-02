import { Image, StyleSheet, Text, View } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import AppLogo from "../../assets/images/icon.png";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";
import CustomButton from "@/components/CustomButton";
import { router } from "expo-router";
const Onboarding = () => {
  const onCreateAccountClick = () => {
    router.navigate("/(auth)/signup");
  };

  const onLoginClick = () => {
    router.navigate("/(auth)/login");
  };

  return (
    <SafeAreaView
      style={[
        commonStyles.alignJustifyCenter,
        { flex: 1, gap: 50, padding: 20 },
      ]}
    >
      <Image source={AppLogo} width={64} height={64} />
      <Text style={[textStyles.xl, textStyles.bolder]}>
        Welcome To Money Manager
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={[textStyles.xl]}>
          A Simple and Beautiful Budgetting App Build on Top of React Native and
          Supa-Base as Backend Service
        </Text>
      </View>
      <View style={{ width: "100%", gap: 20 }}>
        <CustomButton
          colorType="primary"
          label="Create An Account"
          onPress={onCreateAccountClick}
        />
        <CustomButton colorType="gray" label="Login" onPress={onLoginClick} />
      </View>
    </SafeAreaView>
  );
};

export default Onboarding;

const styles = StyleSheet.create({});
