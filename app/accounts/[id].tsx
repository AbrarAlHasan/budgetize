import { useEffect } from "react";
import { useLocalSearchParams, router } from "expo-router";

export default function AccountDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();

  useEffect(() => {
    // Redirect to add screen with id parameter for editing
    if (id) {
      router.replace({
        pathname: "/accounts/add",
        params: { id, from },
      });
    }
  }, [id, from]);

  return null;
}
