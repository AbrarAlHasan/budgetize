import { Tabs } from "expo-router";
import React from "react";

import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import CustomHomeHeader from "@/components/navigation/CustomHeader/CustomHomeHeader";
import CustomReportsHeader from "@/components/navigation/CustomHeader/CustomReportsHeader";
import CustomTransactionsHeader from "@/components/navigation/CustomHeader/CustomTransactionsHeader";
import CustomSettingsHeader from "@/components/navigation/CustomHeader/CustomSettingsHeader";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].primary,
        headerShown: false,
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
          headerShown: true,
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
