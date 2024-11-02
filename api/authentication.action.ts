import { supabase } from "@/lib/supabase";
import {
  logout,
  setCheckingAuthentication,
  setUserDetails,
} from "@/redux/reducers/slice/authSlice";
import { store } from "@/redux/store";
import { compareVersions } from "@/utils/CommonUtlis";
import { nativeApplicationVersion } from "expo-application";
import { router } from "expo-router";
import { Platform } from "react-native";
import flagsmith from "react-native-flagsmith";

export const initiateLogin = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    return { data, error };
  } catch (error) {
    console.log(error);
    return { data: null, error };
  }
};

export const checkActiveSessionAction = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (data?.session?.access_token) {
      store.dispatch(
        setCheckingAuthentication({
          isAuthenticated: true,
          checkingAuthentication: false,
        })
      );
      return true;
    } else {
      store.dispatch(
        setCheckingAuthentication({
          isAuthenticated: false,
          checkingAuthentication: false,
        })
      );
      return false;
    }
  } catch (error) {
    store.dispatch(
      setCheckingAuthentication({
        isAuthenticated: false,
        checkingAuthentication: false,
      })
    );
    return false;
    console.log(error);
  }
};

export const initiateLogout = async () => {
  try {
    const response = await supabase.auth.signOut();

    store.dispatch(logout());
    router.replace("/(auth)/");
  } catch (error) {}
};

export const checkForUpdate = () => {
  const parsedVersion = JSON.parse(flagsmith.getValue("version"));
  let version;

  if (Platform.OS === "android") {
    version = parsedVersion?.android;
  }
  if (Platform.OS === "ios") {
    version = parsedVersion?.ios;
  }

  if (version && nativeApplicationVersion) {
    const value = compareVersions(version?.version, nativeApplicationVersion);
    if (value) {
      router.replace({ pathname: "/updateApp", params: version });
      return true;
    }
  }
  return false;
};
