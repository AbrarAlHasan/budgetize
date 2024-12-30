import { Slot } from "expo-router";

export default function StackLayout() {
  return <Slot screenOptions={{ headerShown: false }}></Slot>;
}
