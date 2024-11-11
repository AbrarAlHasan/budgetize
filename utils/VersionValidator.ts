import { supabase } from "@/lib/supabase";
import { Platform } from "react-native";
import { nativeApplicationVersion } from "expo-application";
import { router } from "expo-router";

export const getVersionDetails = async () => {
  const { data, error } = await supabase
    .from("app_version")
    .select()
    .maybeSingle();

  let version;
  if (error) {
    return true;
  }
  if (Platform.OS === "android") {
    version = {
      version: data?.android_version,
      downloadLink: data?.android_update_link,
    };
  }
  if (Platform.OS === "ios") {
    version = {
      version: data?.ios_version,
      downloadLink: data?.ios_update_link,
    };
  }

  if (version && nativeApplicationVersion) {
    const value = compareVersions(version?.version, nativeApplicationVersion);
    if (value) {
      router.replace({ pathname: "/updateApp", params: version });
      return false;
    }
  }
  return true;
};

export function compareVersions(version1: string, version2: string) {
  const v1 = version1.split(".").map(Number);
  const v2 = version2.split(".").map(Number);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;

    if (num1 > num2) {
      return true;
    } else if (num1 < num2) {
      return false;
    }
  }

  return false; // Both versions are equal
}
