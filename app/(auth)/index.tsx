import {
  Appearance,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import React, { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import AppLogo from "../../assets/images/icon.png";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";
import CustomButton from "@/components/CustomButton";
import { router } from "expo-router";
import { Colors } from "@/constants/Colors";
import LottieView from "lottie-react-native";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { supabase } from "@/lib/supabase";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import GoogleImage from "@/assets/images/google.png";
import AuthImage from "@/assets/images/auth.png";
import { useDispatch } from "react-redux";
import {
  disableLoading,
  enableLoading,
} from "@/redux/reducers/slice/globalSlice";
import { useToast } from "react-native-toast-notifications";
import {
  setCheckingAuthentication,
  setUserDetails,
} from "@/redux/reducers/slice/authSlice";
import { updateLastUsed } from "@/api/authentication.action";

const Onboarding = () => {
  const colorScheme = useColorScheme();
  const onCreateAccountClick = () => {
    router.navigate("/(auth)/signup");
  };

  const onLoginClick = () => {
    router.navigate("/(auth)/login");
  };
  const dispatch = useDispatch();
  const toast = useToast();

  useEffect(() => {
    StatusBar.setBarStyle("dark-content");
    return () => {
      StatusBar.setBarStyle("default");
    };
  }, []);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_IOS_GOOGLE_CLIENT_ID,
    redirectUri: makeRedirectUri({
      scheme: "com.budgetize.app",
    }),
    androidClientId: process.env.EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID,
  });

  const loginWithGoogle = async (idToken: string) => {
    try {
      dispatch(enableLoading());

      const { data: authResult, error } = await supabase.auth.signInWithIdToken(
        {
          provider: "google",
          token: idToken,
        }
      );
      console.log({
        email: authResult?.user?.email,
        userId: authResult?.user?.id,
        name: authResult?.user?.user_metadata?.full_name,
      });
      if (error) {
        throw error;
      }

      if (!authResult?.user?.email)
        throw new Error(
          "Email Not Fetched while authenticating with Google. Please contact Support"
        );

      const existingUser = await supabase
        .from("users")
        .select()
        .eq("email", authResult?.user?.email)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (existingUser?.data === null && error == null) {
        const { data, error } = await supabase.functions.invoke(
          "create-user-social-login",
          {
            body: {
              email: authResult?.user?.email,
              userId: authResult?.user?.id,
              name: authResult?.user?.user_metadata?.full_name,
            },
          }
        );
        console.log("EDGE FUNCTION RESPONSE", data, error);
      }
      if (existingUser) {
        dispatch(setUserDetails(existingUser?.data));
        dispatch(
          setCheckingAuthentication({
            isAuthenticated: true,
            checkingAuthentication: false,
          })
        );
        updateLastUsed(authResult?.user?.id);
        router.replace("/(tabs)/");
      }
    } catch (error) {
      toast.show(error?.toString() || "Error in Authentication", {
        type: "danger",
      });
    } finally {
      dispatch(disableLoading());
    }
  };
  useEffect(() => {
    if (response?.type === "success" && response?.authentication?.idToken) {
      loginWithGoogle(response?.authentication?.idToken);
    }
  }, [response]);

  return (
    <SafeAreaView
      style={[
        commonStyles.alignJustifyCenter,
        {
          flex: 1,
          gap: 50,
          paddingHorizontal: 20,
          backgroundColor: "white",
        },
      ]}
    >
      <View style={{ width: "100%", height: "40%" }}>
        <Image source={AuthImage} style={{ width: "100%", height: "100%" }} />
      </View>
      <View style={{ flex: 1, gap: 10 }}>
        <Text style={[textStyles.xl, textStyles.bolder, { color: "black" }]}>
          Welcome To{" "}
          <Text style={{ color: Colors.light.primary }}>Budgetize</Text>
        </Text>
        <Text style={[textStyles.xs, { color: "black", alignSelf: "center" }]}>
          Master Your Money Flow
        </Text>
      </View>
      <View style={{ width: "100%" }}>
        {/* <CustomButton
          colorType="primary"
          label="Create An Account"
          onPress={onCreateAccountClick}
        />
        <CustomButton colorType="gray" label="Login" onPress={onLoginClick} /> */}
        <CustomButton
          colorType="custom"
          customBackgroundColor="#FFF"
          customTextColor="#4285F4"
          label="Login With Google"
          onPress={() => promptAsync()}
          customStyle={{
            gap: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Image
            source={GoogleImage}
            style={{ width: 20, height: 20 }}
            resizeMode="contain"
          />
          <Text
            style={[textStyles.semiBold, textStyles.md, { color: "#4285F4" }]}
          >
            Continue with Google
          </Text>
        </CustomButton>
      </View>
    </SafeAreaView>
  );
};

export default Onboarding;

const styles = StyleSheet.create({});
