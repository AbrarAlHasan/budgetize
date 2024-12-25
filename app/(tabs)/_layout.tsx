// app/(tabs)/_layout.tsx
import CustomHomeHeader from "@/components/navigation/CustomHeader/CustomHomeHeader";
import CustomReportsHeader from "@/components/navigation/CustomHeader/CustomReportsHeader";
import CustomSettingsHeader from "@/components/navigation/CustomHeader/CustomSettingsHeader";
import CustomTransactionsHeader from "@/components/navigation/CustomHeader/CustomTransactionsHeader";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { Colors } from "@/constants/Colors";
import { Tabs } from "expo-router";
import { Appearance, useColorScheme } from "react-native";

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].primary,
        headerShown: false,
        tabBarInactiveTintColor: Colors[colorScheme ?? "light"].gray,
        tabBarVisibilityAnimationConfig: {
          show: { animation: "spring", config: { delay: 1000 } },
          hide: { animation: "spring" },
        },
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "home" : "home-outline"}
              color={color}
            />
          ),
          header: () => <CustomHomeHeader />,
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="Reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "pie-chart" : "pie-chart-outline"}
              color={color}
            />
          ),
          header: () => <CustomReportsHeader />,
          headerShown: true,
        }}
      />

      <Tabs.Screen
        name="Transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "card" : "card-outline"}
              color={color}
            />
          ),
          header: () => <CustomTransactionsHeader />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="Settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "settings" : "settings-outline"}
              color={color}
            />
          ),
          header: () => <CustomSettingsHeader />,
          headerShown: true,
        }}
      />
    </Tabs>
  );
}
