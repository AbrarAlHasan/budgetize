import { ActiveFilterChips } from "@/components/filters/active-filter-chips";
import { AiSectionHeader } from "@/components/ai/ai-glow";
import { InsightCard } from "@/components/ai/insight-card";
import { SpendingVelocity } from "@/components/reports/spending-velocity";
import {
  RecentTransactionsSkeleton,
  SummaryCardsSkeleton,
} from "@/components/skeletons";
import { TransactionItem } from "@/components/transaction-item";
import { Card } from "@/components/ui/card";
import { useAccounts } from "@/hooks/queries/use-accounts";
import { useDashboardData } from "@/hooks/queries/use-dashboard";
import { useAiInsights } from "@/hooks/use-ai-insights";

import { categoryRepository } from "@/repositories/category.repository";
import { tagRepository } from "@/repositories/tag.repository";
import { transactionTagRepository } from "@/repositories/transaction-tag.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { useSettingsStore } from "@/store/settings-store";
import { useUIStore } from "@/store/ui-store";
import { getCurrencySymbol } from "@/utils/currencies";
import {
  filterTransactionsByIncomePreference,
  incomePreferenceKey,
} from "@/utils/income-preference";
import { logPerformance } from "@/utils/logger";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { router } from "expo-router";
import React from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DashboardScreen() {
  const queryClient = useQueryClient();
  const filters = useUIStore((state) => state.filters.dashboard);
  const setDateRangeFilter = useUIStore((state) => state.setDateRangeFilter);
  const setCurrentFilterContext = useUIStore(
    (state) => state.setCurrentFilterContext
  );

  const { settings, loadSettings } = useSettingsStore();

  React.useEffect(() => {
    loadSettings();
  }, []);

  // Ensure dates are never null - set to current month if null
  React.useEffect(() => {
    if (!filters.startDate || !filters.endDate) {
      const now = new Date();
      const start = format(startOfMonth(now), "yyyy-MM-dd");
      const end = format(endOfMonth(now), "yyyy-MM-dd");
      setDateRangeFilter("dashboard", start, end);
    }
  }, [filters.startDate, filters.endDate, setDateRangeFilter]);

  // Invalidate queries when filters change
  const filterKey = React.useMemo(
    () =>
      JSON.stringify({
        accountIds: filters.accountIds,
        tagIds: filters.tagIds,
        categoryIds: filters.categoryIds,
        startDate: filters.startDate,
        endDate: filters.endDate,
        transactionTypes: filters.transactionTypes,
        accountTypes: filters.accountTypes,
      }),
    [
      filters.accountIds,
      filters.tagIds,
      filters.categoryIds,
      filters.startDate,
      filters.endDate,
      filters.transactionTypes,
      filters.accountTypes,
    ]
  );

  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }, [filterKey, queryClient]);

  const currentMonth = new Date();

  // Check if any filters are active
  const hasActiveFilters =
    (filters.accountIds && filters.accountIds.length > 0) ||
    (filters.tagIds && filters.tagIds.length > 0) ||
    (filters.categoryIds && filters.categoryIds.length > 0) ||
    filters.startDate !== null ||
    filters.endDate !== null ||
    (filters.transactionTypes && filters.transactionTypes.length > 0) ||
    (filters.accountTypes && filters.accountTypes.length > 0);

  // Automatically use filters if any filter is active
  const useFilters = hasActiveFilters;

  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData(
    currentMonth,
    useFilters
  );

  // Spending Velocity dates
  const startDate =
    useFilters && filters.startDate
      ? filters.startDate
      : format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate =
    useFilters && filters.endDate
      ? filters.endDate
      : format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: aiInsights } = useAiInsights();

  // Use optimized query to fetch only latest 10 transactions instead of all
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: [
      "dashboard-latest-transactions",
      startDate,
      endDate,
      filterKey,
      incomePreferenceKey(settings.incomeCalculationEnabled),
    ],
    queryFn: async () => {
      const startTime = Date.now();

      const filterOptions = useFilters
        ? {
            startDate,
            endDate,
            accountIds:
              filters.accountIds && filters.accountIds.length > 0
                ? filters.accountIds
                : undefined,
            accountId: filters.accountId || undefined,
            tagIds:
              filters.tagIds && filters.tagIds.length > 0
                ? filters.tagIds
                : undefined,
            tagId: filters.tagId || undefined,
            categoryIds:
              filters.categoryIds && filters.categoryIds.length > 0
                ? filters.categoryIds
                : undefined,
            categoryId: filters.categoryId || undefined,
            types:
              filters.transactionTypes && filters.transactionTypes.length > 0
                ? filters.transactionTypes
                : undefined,
            type: filters.transactionType || undefined,
            accountTypes:
              filters.accountTypes && filters.accountTypes.length > 0
                ? filters.accountTypes
                : undefined,
            accountType: filters.accountType || undefined,
          }
        : { startDate, endDate };

      // Fetch only latest 10 transactions directly from database
      const rawTransactions =
        await transactionRepository.findLatestTransactionsWithFilters(
          10,
          filterOptions
        );

      // Decrypt only the transactions we need
      const decrypted = await transactionRepository.decryptTransactions(
        rawTransactions
      );

      const filtered = filterTransactionsByIncomePreference(
        decrypted,
        settings.incomeCalculationEnabled
      );

      const endTime = Date.now();
      logPerformance(
        "Dashboard_latest_transactions_query",
        endTime - startTime,
        `${filtered.length} transactions`
      );

      return filtered;
    },
    enabled: !!startDate && !!endDate,
  });

  const { data: accounts } = useAccounts();

  const [transactionTags, setTransactionTags] = React.useState<
    Map<number, Array<{ id: number; name: string }>>
  >(new Map());
  const [transactionCategories, setTransactionCategories] = React.useState<
    Map<number, string>
  >(new Map());
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    // Only load tags and categories for the transactions we actually display (max 10)
    if (transactions && transactions.length > 0) {
      const loadTagsAndCategories = async () => {
        const tagsMap = new Map<number, Array<{ id: number; name: string }>>();
        const categoriesMap = new Map<number, string>();

        // Collect all transaction IDs and category IDs first
        const transactionIds = transactions.map((t) => t.id);
        const categoryIds = transactions
          .map((t) => t.category_id)
          .filter((id): id is number => id !== null && id !== 0);

        // Load all transaction tags in parallel
        const allTransactionTags = await Promise.all(
          transactionIds.map((id) =>
            transactionTagRepository.findByTransactionId(id)
          )
        );

        // Collect all unique tag IDs
        const tagIdsSet = new Set<number>();
        allTransactionTags.forEach((tags) => {
          tags.forEach((tt) => tagIdsSet.add(tt.tag_id));
        });
        const tagIds = Array.from(tagIdsSet);

        // Batch fetch all tags and categories
        const [allTags, allCategories] = await Promise.all([
          tagIds.length > 0
            ? tagRepository.findByIdsIncludingDeleted(tagIds)
            : Promise.resolve([]),
          categoryIds.length > 0
            ? categoryRepository.findByIdsIncludingDeleted(categoryIds)
            : Promise.resolve([]),
        ]);

        // Decrypt all tags and categories in parallel
        const [decryptedTags, decryptedCategories] = await Promise.all([
          tagRepository.decryptTags(allTags),
          categoryRepository.decryptCategories(allCategories),
        ]);

        // Create lookup maps
        const tagMap = new Map(decryptedTags.map((t) => [t.id, t]));
        const categoryMap = new Map(decryptedCategories.map((c) => [c.id, c]));

        // Map tags and categories back to transactions
        transactions.forEach((transaction, index) => {
          const transactionTagIds = allTransactionTags[index];
          const tagDetails = transactionTagIds
            .map((tt) => {
              const tag = tagMap.get(tt.tag_id);
              return tag ? { id: tag.id, name: tag.name } : null;
            })
            .filter((t): t is { id: number; name: string } => t !== null);
          tagsMap.set(transaction.id, tagDetails);

          if (transaction.category_id) {
            const category = categoryMap.get(transaction.category_id);
            if (category) {
              categoriesMap.set(transaction.id, category.name);
            }
          }
        });
        setTransactionTags(tagsMap);
        setTransactionCategories(categoriesMap);
      };
      loadTagsAndCategories();
    }
  }, [transactions]);

  const getAccountName = (accountId: number) => {
    return accounts?.find((a) => a.id === accountId)?.name || "";
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // Force refetch by removing cache and refetching
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["dashboard"] }),
        queryClient.refetchQueries({ queryKey: ["transactions"] }),
        queryClient.refetchQueries({
          queryKey: ["dashboard-latest-transactions"],
        }),
        queryClient.refetchQueries({ queryKey: ["accounts"] }),
        queryClient.refetchQueries({ queryKey: ["spendingVelocity"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const handleApplyFilters = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={["top"]}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-6 pb-6">
          {/* Header */}
          <View className="mb-6 flex-row items-center justify-between">
            <View>
              <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                Dashboard
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {format(new Date(), "MMMM yyyy")}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setCurrentFilterContext("dashboard");
                router.push({
                  pathname: "/filters",
                  params: { context: "dashboard" },
                });
              }}
              className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl"
              style={{
                backgroundColor: hasActiveFilters ? "#EFF6FF" : "#F3F4F6",
              }}
            >
              <Ionicons
                name="filter"
                size={20}
                color={hasActiveFilters ? "#3B82F6" : "#6B7280"}
              />
              {hasActiveFilters && (
                <View className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </TouchableOpacity>
          </View>

          <ActiveFilterChips context="dashboard" />

          {/* Summary Cards */}
          {dashboardLoading ? (
            <SummaryCardsSkeleton
              showIncome={settings.incomeCalculationEnabled}
            />
          ) : (
            <View className="mb-6">
              <View
                className={`flex-row gap-3 ${
                  settings.incomeCalculationEnabled ? "mb-3" : ""
                }`}
              >
                {/* Income Card - Only show if income calculation is enabled */}
                {settings.incomeCalculationEnabled && (
                  <View
                    className="flex-1 rounded-2xl p-4"
                    style={{ backgroundColor: "#D1FAE5" }}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-xs font-medium text-gray-600">
                        Income
                      </Text>
                      <Ionicons name="arrow-up" size={16} color="#10B981" />
                    </View>
                    <Text className="text-2xl font-bold text-gray-900">
                      {getCurrencySymbol(settings.currency)}
                      {dashboardData?.totalIncome.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || "0.00"}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      This month
                    </Text>
                  </View>
                )}

                {/* Expense Card */}
                <View
                  className="flex-1 rounded-2xl p-4"
                  style={{ backgroundColor: "#FEE2E2" }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-medium text-gray-600">
                      Expense
                    </Text>
                    <Ionicons name="arrow-down" size={16} color="#EF4444" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">
                    {getCurrencySymbol(settings.currency)}
                    {dashboardData?.totalSpending.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || "0.00"}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">This month</Text>
                </View>
              </View>

              {/* Net Amount Card - Only show if income calculation is enabled */}
              {settings.incomeCalculationEnabled && (
                <Card
                  className="bg-gradient-to-r"
                  style={{
                    backgroundColor:
                      (dashboardData?.netAmount || 0) >= 0
                        ? "#F0FDF4"
                        : "#FEF2F2",
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Net Amount
                      </Text>
                      <Text
                        className={`
                    text-2xl font-bold
                    ${
                      (dashboardData?.netAmount || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  `}
                      >
                        {getCurrencySymbol(settings.currency)}
                        {dashboardData?.netAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) || "0.00"}
                      </Text>
                    </View>
                    <Ionicons
                      name={
                        (dashboardData?.netAmount || 0) >= 0
                          ? "trending-up"
                          : "trending-down"
                      }
                      size={32}
                      color={
                        (dashboardData?.netAmount || 0) >= 0
                          ? "#10B981"
                          : "#EF4444"
                      }
                    />
                  </View>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {dashboardData?.transactionCount || 0} transactions
                  </Text>
                </Card>
              )}
            </View>
          )}

          {/* AI Insights */}
          {aiInsights && aiInsights.length > 0 && (
            <View className="mb-6">
              <AiSectionHeader title="Insights" />
              {aiInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </View>
          )}

          {/* Spending Velocity */}

          <SpendingVelocity
            startDate={startDate}
            endDate={endDate}
            useFilters={useFilters}
          />

          {/* Quick Actions */}
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/expenses/add",
                  params: { from: "Dashboard" },
                })
              }
              className="flex-1 bg-blue-600 rounded-2xl py-4 items-center"
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={24} color="#FFFFFF" />
              <Text className="text-white font-semibold mt-1">Add Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/accounts/add",
                  params: { from: "Dashboard" },
                })
              }
              className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-2xl py-4 items-center"
              activeOpacity={0.8}
            >
              <Ionicons name="wallet" size={24} color="#374151" />
              <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-1">
                Add Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Recent Transactions */}
          <View>
            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Recent Activity
            </Text>
            {transactionsLoading ? (
              <RecentTransactionsSkeleton />
            ) : transactions && transactions.length > 0 ? (
              transactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  id={transaction.id}
                  amount={transaction.amount}
                  type={transaction.type}
                  date={transaction.date}
                  note={transaction.note}
                  payment_mode={transaction.payment_mode}
                  accountName={getAccountName(transaction.account_id)}
                  currencySymbol={getCurrencySymbol(settings.currency)}
                  tags={transactionTags.get(transaction.id)}
                  categoryName={transactionCategories.get(transaction.id)}
                />
              ))
            ) : (
              <View className="bg-white dark:bg-gray-900 rounded-2xl p-8 items-center">
                <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
                <Text className="text-gray-500 dark:text-gray-400 text-center mt-4">
                  No transactions this month
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
