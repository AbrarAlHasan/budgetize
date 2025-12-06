import { AccountLatestTransactions } from "@/components/accounts/account-latest-transactions";
import { CreditCardStack } from "@/components/accounts/credit-card-stack";
import { CreditCardStackSkeleton } from "@/components/skeletons";
import { useAccountBalances } from "@/hooks/queries/use-account-balances";
import { useAccounts } from "@/hooks/queries/use-accounts";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountsScreen() {
  const queryClient = useQueryClient();
  const { data: accounts, isLoading } = useAccounts();
  const { data: accountBalances, isLoading: balancesLoading } = useAccountBalances();
  const [refreshing, setRefreshing] = React.useState(false);
  const [currentAccountId, setCurrentAccountId] = React.useState<number | null>(null);

  // Set initial account when accounts load
  React.useEffect(() => {
    if (accounts && accounts.length > 0 && !currentAccountId) {
      setCurrentAccountId(accounts[0].id);
    }
  }, [accounts, currentAccountId]);

  // Refetch latest transactions when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Refetch account-latest-transactions when screen is focused
      queryClient.refetchQueries({ queryKey: ["account-latest-transactions"] });
    }, [queryClient])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // Force refetch by removing cache and refetching
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["accounts"] }),
        queryClient.refetchQueries({ queryKey: ["account-balances"] }),
        queryClient.refetchQueries({ queryKey: ["accountMonthlyData"] }),
        queryClient.refetchQueries({ queryKey: ["accountSpendingVelocity"] }),
        queryClient.refetchQueries({ queryKey: ["account-latest-transactions"] }),
        queryClient.refetchQueries({ queryKey: ["transactions"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-black"
      edges={["top"]}
    >
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View className="px-5 pt-6 pb-6">
          <View className="mb-6 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                Accounts
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                Manage your accounts
              </Text>
            </View>
            <TouchableOpacity
              onPress={onRefresh}
              disabled={refreshing}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
              activeOpacity={0.7}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Ionicons name="refresh" size={20} color="#3B82F6" />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/accounts/add",
                params: { from: "Accounts" },
              })
            }
            className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800"
            activeOpacity={0.7}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <View className="py-4 px-5 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 items-center justify-center mr-4">
                  <Ionicons name="add-circle" size={24} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-gray-100 font-semibold text-base mb-0.5">
                    Add New Account
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-sm">
                    Create a new account to track
                  </Text>
                </View>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color="#9CA3AF" 
                style={{ marginLeft: 8 }}
              />
            </View>
          </TouchableOpacity>

          {isLoading || balancesLoading ? (
            <CreditCardStackSkeleton />
          ) : accounts && accounts.length > 0 ? (
            <>
              <CreditCardStack 
                accounts={accounts} 
                accountBalances={accountBalances}
                onCurrentAccountChange={setCurrentAccountId}
              />
              {currentAccountId && (
                <AccountLatestTransactions accountId={currentAccountId} />
              )}
            </>
          ) : (
            <View className="bg-white dark:bg-gray-900 rounded-2xl p-8 items-center">
              <Ionicons name="wallet-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 dark:text-gray-400 text-center mt-4 mb-6">
                No accounts yet
              </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/accounts/add",
                    params: { from: "Accounts" },
                  })
                }
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-6 py-4"
                activeOpacity={0.7}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <View className="flex-row items-center justify-center">
                  <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 items-center justify-center mr-3">
                    <Ionicons name="add-circle" size={20} color="#3B82F6" />
                  </View>
                  <Text className="text-gray-900 dark:text-gray-100 font-semibold text-base">
                    Create Your First Account
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
