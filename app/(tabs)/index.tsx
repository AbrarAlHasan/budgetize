import { TransactionItem } from '@/components/transaction-item';
import { Card } from '@/components/ui/card';
import { useAccounts } from '@/hooks/queries/use-accounts';
import { useCategories } from '@/hooks/queries/use-categories';
import { useCategoryBreakdown, useDashboardData } from '@/hooks/queries/use-dashboard';
import { useTransactions } from '@/hooks/queries/use-transactions';
import { categoryRepository } from '@/repositories/category.repository';
import { tagRepository } from '@/repositories/tag.repository';
import { transactionTagRepository } from '@/repositories/transaction-tag.repository';
import { useSettingsStore } from '@/store/settings-store';
import { useUIStore } from '@/store/ui-store';
import { getCurrencySymbol } from '@/utils/currencies';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const queryClient = useQueryClient();
  const filters = useUIStore((state) => state.filters.dashboard);
  const setCurrentFilterContext = useUIStore((state) => state.setCurrentFilterContext);
  const { settings, loadSettings } = useSettingsStore();

  React.useEffect(() => {
    loadSettings();
  }, []);
  
  // Invalidate queries when filters change
  const filterKey = React.useMemo(() => 
    JSON.stringify({
      accountIds: filters.accountIds,
      tagIds: filters.tagIds,
      categoryIds: filters.categoryIds,
      startDate: filters.startDate,
      endDate: filters.endDate,
      transactionTypes: filters.transactionTypes,
      accountTypes: filters.accountTypes,
    }),
    [filters.accountIds, filters.tagIds, filters.categoryIds, filters.startDate, filters.endDate, filters.transactionTypes, filters.accountTypes]
  );
  
  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
  
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData(currentMonth, useFilters);
  const { data: categoryData, isLoading: categoryLoading } = useCategoryBreakdown(currentMonth, useFilters);
  
  // Use filter dates if filters are active, otherwise use current month
  const startDate = useFilters && filters.startDate 
    ? filters.startDate 
    : format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endDate = useFilters && filters.endDate 
    ? filters.endDate 
    : format(endOfMonth(currentMonth), 'yyyy-MM-dd');
  
  const { data: transactions, isLoading: transactionsLoading } = useTransactions(
    useFilters ? {
      startDate,
      endDate,
      accountIds: filters.accountIds && filters.accountIds.length > 0 ? filters.accountIds : undefined,
      accountId: filters.accountId || undefined,
      tagIds: filters.tagIds && filters.tagIds.length > 0 ? filters.tagIds : undefined,
      tagId: filters.tagId || undefined,
      categoryIds: filters.categoryIds && filters.categoryIds.length > 0 ? filters.categoryIds : undefined,
      categoryId: filters.categoryId || undefined,
      types: filters.transactionTypes && filters.transactionTypes.length > 0 ? filters.transactionTypes : undefined,
      type: filters.transactionType || undefined,
      accountTypes: filters.accountTypes && filters.accountTypes.length > 0 ? filters.accountTypes : undefined,
      accountType: filters.accountType || undefined,
    } : { startDate, endDate }
  );
  
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const [transactionTags, setTransactionTags] = React.useState<Map<number, Array<{ id: number; name: string }>>>(new Map());
  const [transactionCategories, setTransactionCategories] = React.useState<Map<number, string>>(new Map());
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (transactions) {
      const loadTagsAndCategories = async () => {
        const tagsMap = new Map<number, Array<{ id: number; name: string }>>();
        const categoriesMap = new Map<number, string>();
        for (const transaction of transactions) {
          // Load tags (including deleted ones)
          const tags = await transactionTagRepository.findByTransactionId(transaction.id);
          const tagDetails = await Promise.all(
            tags.map(async (tt) => {
              const tag = await tagRepository.findByIdIncludingDeleted(tt.tag_id);
              if (!tag) return null;
              const decryptedTag = await tagRepository.decryptTag(tag);
              return { id: decryptedTag.id, name: decryptedTag.name };
            })
          );
          tagsMap.set(transaction.id, tagDetails.filter((t): t is { id: number; name: string } => t !== null));
          
          // Load category (including deleted ones)
          if (transaction.category_id) {
            const category = await categoryRepository.findByIdIncludingDeleted(transaction.category_id);
            if (category) {
              const decryptedCategory = await categoryRepository.decryptCategory(category);
              categoriesMap.set(transaction.id, decryptedCategory.name);
            }
          }
        }
        setTransactionTags(tagsMap);
        setTransactionCategories(categoriesMap);
      };
      loadTagsAndCategories();
    }
  }, [transactions]);

  const getAccountName = (accountId: number) => {
    return accounts?.find((a) => a.id === accountId)?.name || '';
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const handleApplyFilters = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  if (dashboardLoading || transactionsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
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
              {format(new Date(), 'MMMM yyyy')}
            </Text>
          </View>
            <TouchableOpacity
              onPress={() => {
                setCurrentFilterContext('dashboard');
                router.push({ pathname: '/filters', params: { context: 'dashboard' } });
              }}
            className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{ 
              backgroundColor: hasActiveFilters ? '#EFF6FF' : '#F3F4F6',
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

        {/* Summary Cards */}
        <View className="mb-6">
          <View className={`flex-row gap-3 ${settings.incomeCalculationEnabled ? 'mb-3' : ''}`}>
            {/* Income Card - Only show if income calculation is enabled */}
            {settings.incomeCalculationEnabled && (
              <View 
                className="flex-1 rounded-2xl p-4"
                style={{ backgroundColor: '#D1FAE5' }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-medium text-gray-600">Income</Text>
                  <Ionicons name="arrow-up" size={16} color="#10B981" />
                </View>
                <Text className="text-2xl font-bold text-gray-900">
                  {getCurrencySymbol(settings.currency)}{dashboardData?.totalIncome.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || '0.00'}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">This month</Text>
              </View>
            )}

            {/* Expense Card */}
            <View 
              className="flex-1 rounded-2xl p-4"
              style={{ backgroundColor: '#FEE2E2' }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-medium text-gray-600">Expense</Text>
                <Ionicons name="arrow-down" size={16} color="#EF4444" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">
                {getCurrencySymbol(settings.currency)}{dashboardData?.totalSpending.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
              </Text>
              <Text className="text-xs text-gray-500 mt-1">This month</Text>
            </View>
          </View>

          {/* Net Amount Card - Only show if income calculation is enabled */}
          {settings.incomeCalculationEnabled && (
            <Card className="bg-gradient-to-r" style={{ backgroundColor: (dashboardData?.netAmount || 0) >= 0 ? '#F0FDF4' : '#FEF2F2' }}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">Net Amount</Text>
                  <Text className={`
                    text-2xl font-bold
                    ${(dashboardData?.netAmount || 0) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'}
                  `}>
                    {getCurrencySymbol(settings.currency)}{dashboardData?.netAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                  </Text>
                </View>
                <Ionicons 
                  name={(dashboardData?.netAmount || 0) >= 0 ? "trending-up" : "trending-down"} 
                  size={32} 
                  color={(dashboardData?.netAmount || 0) >= 0 ? "#10B981" : "#EF4444"} 
                />
              </View>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {dashboardData?.transactionCount || 0} transactions
              </Text>
            </Card>
          )}
        </View>

        {/* Category Breakdown */}
        {categoryData && categoryData.length > 0 && (
          <Card className="mb-6">
            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Category Breakdown
            </Text>
            {categoryLoading ? (
              <ActivityIndicator />
            ) : (
              <View className="gap-3">
                {categoryData.map((category, index) => {
                  const percentage = Math.min((category.amount / (dashboardData?.totalSpending || 1)) * 100, 100);
                  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
                  const color = colors[index % colors.length];
                  
                  return (
                    <View key={category.categoryId}>
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {category.categoryName}
                        </Text>
                        <View className="flex-row items-center gap-2">
                          <Text className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {getCurrencySymbol(settings.currency)}{category.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                          <Text className="text-xs text-gray-500 dark:text-gray-400">
                            {percentage.toFixed(0)}%
                          </Text>
                        </View>
                      </View>
                      <View className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: color,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        )}

        {/* Quick Actions */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: '/expenses/add', params: { from: 'Dashboard' } })
            }
            className="flex-1 bg-blue-600 rounded-2xl py-4 items-center"
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text className="text-white font-semibold mt-1">Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/accounts/add', params: { from: 'Dashboard' } })}
            className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-2xl py-4 items-center"
            activeOpacity={0.8}
          >
            <Ionicons name="wallet" size={24} color="#374151" />
            <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-1">Add Account</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View>
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Recent Activity
          </Text>
          {transactions && transactions.length > 0 ? (
            transactions.slice(0, 10).map((transaction) => (
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

