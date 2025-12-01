import { ExchangeItem } from "@/components/exchange-item";
import { Card } from "@/components/ui/card";
import { ExchangeStatus, ExchangeType } from "@/db/schema/types";
import { useExchanges, usePendingExchangesSummary } from "@/hooks/queries/use-exchanges";
import { useSettingsStore } from "@/store/settings-store";
import { cn } from "@/utils/cn";
import { getCurrencySymbol } from "@/utils/currencies";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterType = "all" | "lent" | "borrowed";
type FilterStatus = "all" | "pending" | "settled";

export default function ExchangesScreen() {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const { settings } = useSettingsStore();
  const currencySymbol = getCurrencySymbol(settings?.currency || "INR");

  // Build filters for query - all filtering done in SQL
  const typeFilter: ExchangeType | undefined =
    filterType === "all" ? undefined : filterType;
  const settledFilter: boolean | undefined =
    filterStatus === "settled" ? true : undefined;
  const statusFilter: ExchangeStatus | undefined =
    filterStatus === "all" || filterStatus === "settled"
      ? undefined
      : filterStatus;

  const { data: exchanges, isLoading, refetch, isRefetching } = useExchanges({
    type: typeFilter,
    status: statusFilter,
    settled: settledFilter,
  });

  const { data: summary } = usePendingExchangesSummary();

  // Separate exchanges by type (for display grouping only - data already filtered in SQL)
  const lentExchanges = exchanges?.filter((exchange) => exchange.type === "lent") || [];
  const borrowedExchanges = exchanges?.filter((exchange) => exchange.type === "borrowed") || [];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <SafeAreaView
        className="flex-1 bg-gray-50 dark:bg-black"
        edges={["top"]}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          <View className="px-5 pt-6 pb-6">
            {/* Header */}
            <View className="mb-6 flex-row items-center justify-between">
              <View>
                <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Exchange
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  Track money lent and borrowed
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/exchanges/add")}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={24} color="#3B82F6" />
              </TouchableOpacity>
            </View>

            {/* Summary Cards - Matching Dashboard style */}
            <View className="mb-6">
              <View className="flex-row gap-3">
                {/* To Receive Card */}
                <View
                  className="flex-1 rounded-2xl p-4"
                  style={{ backgroundColor: "#DBEAFE" }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-medium text-gray-600">
                      To Receive
                    </Text>
                    <Ionicons name="arrow-down" size={16} color="#3B82F6" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">
                    {currencySymbol}
                    {summary?.totalLent.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || "0.00"}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    {summary?.lentCount || 0} pending
                  </Text>
                </View>

                {/* To Pay Card */}
                <View
                  className="flex-1 rounded-2xl p-4"
                  style={{ backgroundColor: "#FEF3C7" }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-medium text-gray-600">
                      To Pay
                    </Text>
                    <Ionicons name="arrow-up" size={16} color="#F59E0B" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">
                    {currencySymbol}
                    {summary?.totalBorrowed.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || "0.00"}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    {summary?.borrowedCount || 0} pending
                  </Text>
                </View>
              </View>
            </View>

            {/* Filters - In a Card */}
            <Card className="mb-6">
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Type
                </Text>
                <View className="flex-row gap-2">
                  {(["all", "lent", "borrowed"] as FilterType[]).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setFilterType(type)}
                      className={cn(
                        "px-4 py-2 rounded-lg flex-row items-center",
                        filterType === type
                          ? "bg-blue-600 dark:bg-blue-500"
                          : "bg-gray-200 dark:bg-gray-700"
                      )}
                    >
                      {type !== "all" && (
                        <Ionicons
                          name={type === "lent" ? "trending-up" : "trending-down"}
                          size={14}
                          color={filterType === type ? "#FFFFFF" : (type === "lent" ? "#3B82F6" : "#F59E0B")}
                          style={{ marginRight: 4 }}
                        />
                      )}
                      <Text
                        className={cn(
                          "text-sm font-medium capitalize",
                          filterType === type
                            ? "text-white"
                            : "text-gray-700 dark:text-gray-300"
                        )}
                      >
                        {type === "all" ? "All" : type === "lent" ? "Lent" : "Borrowed"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Status
                </Text>
                <View className="flex-row gap-2">
                  {(["all", "pending", "settled"] as FilterStatus[]).map((status) => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => setFilterStatus(status)}
                      className={cn(
                        "px-4 py-2 rounded-lg flex-row items-center",
                        filterStatus === status
                          ? "bg-blue-600 dark:bg-blue-500"
                          : "bg-gray-200 dark:bg-gray-700"
                      )}
                    >
                      {status !== "all" && (
                        <Ionicons
                          name={status === "pending" ? "hourglass-outline" : "checkmark-circle-outline"}
                          size={14}
                          color={filterStatus === status ? "#FFFFFF" : "#6B7280"}
                          style={{ marginRight: 4 }}
                        />
                      )}
                      <Text
                        className={cn(
                          "text-sm font-medium capitalize",
                          filterStatus === status
                            ? "text-white"
                            : "text-gray-700 dark:text-gray-300"
                        )}
                      >
                        {status === "all" ? "All" : status === "pending" ? "Pending" : "Settled"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Card>

            {/* Exchanges List */}
            {isLoading ? (
              <View className="py-10">
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : exchanges && exchanges.length > 0 ? (
              <View>
                {lentExchanges.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Money Lent ({lentExchanges.length})
                    </Text>
                    {lentExchanges.map((exchange) => (
                      <ExchangeItem
                        key={exchange.id}
                        {...exchange}
                        currencySymbol={currencySymbol}
                      />
                    ))}
                  </View>
                )}

                {borrowedExchanges.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Money Borrowed ({borrowedExchanges.length})
                    </Text>
                    {borrowedExchanges.map((exchange) => (
                      <ExchangeItem
                        key={exchange.id}
                        {...exchange}
                        currencySymbol={currencySymbol}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <Card>
                <View className="py-8 items-center">
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={48}
                    color="#9CA3AF"
                    style={{ marginBottom: 12 }}
                  />
                  <Text className="text-base font-medium text-gray-600 dark:text-gray-400 mb-1">
                    No exchanges found
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-500 text-center">
                    {filterType !== "all" || filterStatus !== "all"
                      ? "Try adjusting your filters"
                      : "Start tracking your exchanges by adding one"}
                  </Text>
                  {filterType === "all" && filterStatus === "all" && (
                    <TouchableOpacity
                      onPress={() => router.push("/exchanges/add")}
                      className="mt-4 bg-blue-600 dark:bg-blue-500 px-6 py-3 rounded-lg flex-row items-center"
                    >
                      <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text className="text-white font-semibold">Add Exchange</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

