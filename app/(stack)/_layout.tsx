// app/(stack)/_layout.tsx
import { Stack } from "expo-router";

export default function StackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="addCategory"
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
      <Stack.Screen
        name="addTransaction"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="transactions"
        options={{ headerShown: false, presentation: "formSheet" }}
      />
    </Stack>
  );
}
