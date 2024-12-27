// app/(stack)/_layout.tsx
import { Stack } from "expo-router";

export default function StackLayout() {
  return (
    <Stack screenOptions={{ animation: "none" }}>
      <Stack.Screen
        name="addCategory"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "default",
        }}
      />
      <Stack.Screen
        name="addTransaction"
        options={{
          headerShown: false,
          animation: "none",
        }}
      />
      <Stack.Screen
        name="transactions"
        options={{ headerShown: false, presentation: "formSheet" }}
      />
      <Stack.Screen
        name="confirmTransaction"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="(addBudget)" options={{ headerShown: false }} />
      <Stack.Screen name="uploadTransaction" options={{ headerShown: false }} />
    </Stack>
  );
}
