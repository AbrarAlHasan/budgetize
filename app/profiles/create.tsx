// This file is kept for backward compatibility
// It redirects to the unified form screen
import { router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function CreateProfileScreen() {
  useEffect(() => {
    // Use replace to avoid adding to history and prevent loops
    router.replace({
      pathname: "/profiles/[id]",
      params: { id: "new" },
    });
  }, []);

  return <View style={{ flex: 1 }} />;
}
