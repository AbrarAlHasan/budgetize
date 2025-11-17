import { AccountCard } from "@/components/account-card";
import { useAccounts } from "@/hooks/queries/use-accounts";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountsScreen() {
  const queryClient = useQueryClient();
  const { data: accounts, isLoading } = useAccounts();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        edges={["top"]}
      >
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      edges={["top"]}
    >
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-6 pb-6">
          <View className="mb-6">
            <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Accounts
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Manage your accounts
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: "/accounts/add", params: { from: "Accounts" } })
            }
            className="mb-6 bg-blue-600 rounded-2xl py-4 items-center flex-row justify-center"
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text className="text-white font-semibold ml-2">Add Account</Text>
          </TouchableOpacity>

          {accounts && accounts.length > 0 ? (
            accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))
          ) : (
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-8 items-center">
              <Ionicons name="wallet-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 dark:text-gray-400 text-center mt-4 mb-6">
                No accounts yet
              </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push({ pathname: "/accounts/add", params: { from: "Accounts" } })
                }
                className="bg-blue-600 rounded-2xl px-6 py-3"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold">
                  Create Your First Account
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
