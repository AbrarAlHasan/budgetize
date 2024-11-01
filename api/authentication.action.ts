import { supabase } from "@/lib/supabase";
import {
  logout,
  setCheckingAuthentication,
  setUserDetails,
} from "@/redux/reducers/slice/authSlice";
import { store } from "@/redux/store";
import { router } from "expo-router";

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
          checkingAuthentication: true,
        })
      );
      return false;
    }
  } catch (error) {
    store.dispatch(
      setCheckingAuthentication({
        isAuthenticated: false,
        checkingAuthentication: true,
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
