import { AnimatedNumber } from '@/components/charts/animated-number';
import { AnimatedProgressBar } from '@/components/charts/animated-progress-bar';
import { SimpleBarChart } from '@/components/charts/simple-bar-chart';
import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import {
  AccountAnalysisSkeleton,
  ChartSkeleton,
  EnhancedBreakdownSkeleton,
  ReportsSummaryCardsSkeleton,
} from '@/components/skeletons';
import { Card } from '@/components/ui/card';
import {
  useAccountReport,
  useCategoryReport,
  useDailyPatterns,
  useMonthlyTrends,
  useReportSummary,
  useTagReport
} from '@/hooks/queries/use-reports';
import { useSettingsStore } from '@/store/settings-store';
import { useUIStore } from '@/store/ui-store';
import { getCurrencySymbol } from '@/utils/currencies';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReportsScreen() {
  const queryClient = useQueryClient();
  const filters = useUIStore((state) => state.filters.reports);
  const setCurrentFilterContext = useUIStore((state) => state.setCurrentFilterContext);
  const { settings, loadSettings } = useSettingsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [chartAnimationKey, setChartAnimationKey] = useState(0);

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
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  }, [filterKey, queryClient]);

  // Use filter dates if available, otherwise use current month
  const defaultStartDate = startOfMonth(new Date());
  const defaultEndDate = endOfMonth(new Date());
  
  const startDate = filters.startDate 
    ? new Date(filters.startDate) 
    : defaultStartDate;
  const endDate = filters.endDate 
    ? new Date(filters.endDate) 
    : defaultEndDate;

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');
  const trendStartDateStr = format(subMonths(endDate, 10), 'yyyy-MM-dd');

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

  const { data: summary, isLoading: summaryLoading } = useReportSummary(startDateStr, endDateStr, useFilters);
  const { data: categoryReport, isLoading: categoryLoading } = useCategoryReport(startDateStr, endDateStr, useFilters);
  const { data: tagReport, isLoading: tagLoading } = useTagReport(startDateStr, endDateStr, useFilters);
  const { data: accountReport, isLoading: accountLoading } = useAccountReport(startDateStr, endDateStr, useFilters);
  const { data: dailyPatterns, isLoading: dailyLoading, isFetching: dailyFetching } = useDailyPatterns(startDateStr, endDateStr, useFilters);
  const { data: monthlyTrends, isLoading: monthlyLoading } = useMonthlyTrends(trendStartDateStr, endDateStr, useFilters);

  // Memoize daily patterns chart data with stable reference
  const dailyChartData = React.useMemo(() => {
    if (!dailyPatterns || dailyPatterns.length === 0) return null;
    const data = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => {
      const entry = dailyPatterns.find((p) => p.dayOfWeek === day);
      return {
        label: day,
        value: entry ? entry.totalAmount : 0,
      };
    });
    // Return a stable reference by creating a new array only when values actually change
    return data;
  }, [dailyPatterns]);

  // Memoize monthly trends chart data with stable reference
  const monthlyChartData = React.useMemo(() => {
    if (!monthlyTrends || monthlyTrends.length === 0) return null;
    const data = monthlyTrends.map((t) => ({
      label: t.month.split(' ')[0],
      value: t.totalExpenses,
    }));
    return data;
  }, [monthlyTrends]);

  // Track data keys separately for each chart to prevent unnecessary updates
  const previousDailyKey = React.useRef<string>('');
  const previousMonthlyKey = React.useRef<string>('');
  const isInitialLoad = React.useRef<{ daily: boolean; monthly: boolean }>({ daily: true, monthly: true });

  React.useEffect(() => {
    // Handle daily patterns
    if (dailyPatterns && dailyPatterns.length > 0) {
      const currentKey = JSON.stringify(
        dailyPatterns.map(p => ({ day: p.dayOfWeek, amount: p.totalAmount }))
      );
      
      if (currentKey !== previousDailyKey.current) {
        if (!isInitialLoad.current.daily) {
          // Only update animation key if it's not the initial load
          setChartAnimationKey((prev) => prev + 1);
        } else {
          // Mark initial load as complete
          isInitialLoad.current.daily = false;
        }
        previousDailyKey.current = currentKey;
      }
    } else if (dailyPatterns === undefined || dailyPatterns.length === 0) {
      // Reset initial load flag when data is cleared
      isInitialLoad.current.daily = true;
      previousDailyKey.current = '';
    }
  }, [dailyPatterns]);

  React.useEffect(() => {
    // Handle monthly trends
    if (monthlyTrends && monthlyTrends.length > 0) {
      const currentKey = JSON.stringify(
        monthlyTrends.map(t => ({ month: t.month, expenses: t.totalExpenses }))
      );
      
      if (currentKey !== previousMonthlyKey.current) {
        if (!isInitialLoad.current.monthly) {
          // Only update animation key if it's not the initial load
          setChartAnimationKey((prev) => prev + 1);
        } else {
          // Mark initial load as complete
          isInitialLoad.current.monthly = false;
        }
        previousMonthlyKey.current = currentKey;
      }
    } else if (monthlyTrends === undefined || monthlyTrends.length === 0) {
      // Reset initial load flag when data is cleared
      isInitialLoad.current.monthly = true;
      previousMonthlyKey.current = '';
    }
  }, [monthlyTrends]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Force refetch by removing cache and refetching
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['reports'] }),
        queryClient.refetchQueries({ queryKey: ['transactions'] }),
        queryClient.refetchQueries({ queryKey: ['accounts'] }),
        queryClient.refetchQueries({ queryKey: ['spendingVelocity'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

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
        {/* Header with Filter Button */}
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Reports
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
                Financial insights & analytics
            </Text>
          </View>
            <TouchableOpacity
              onPress={() => {
                setCurrentFilterContext('reports');
                router.push({ pathname: '/filters', params: { context: 'reports' } });
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

        <ActiveFilterChips context="reports" />

        {/* Enhanced Summary Cards */}
        {summaryLoading ? (
          <ReportsSummaryCardsSkeleton showIncome={settings.incomeCalculationEnabled} />
        ) : summary ? (
              <View className="mb-6">
                <View className={`flex-row gap-3 ${settings.incomeCalculationEnabled ? 'mb-3' : ''}`}>
                    {/* Income Card */}
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
                        {getCurrencySymbol(settings.currency)}{summary.totalIncome.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                        <Text className="text-xs text-gray-500 mt-1">
                          Avg: {getCurrencySymbol(settings.currency)}{summary.averageIncome.toFixed(2)}
                      </Text>
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
                    <AnimatedNumber
                      value={summary.totalExpenses}
                      prefix={getCurrencySymbol(settings.currency)}
                      animationKey={chartAnimationKey}
                      style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}
                    />
                      <Text className="text-xs text-gray-500 mt-1">
                        Avg: {getCurrencySymbol(settings.currency)}{summary.averageExpense.toFixed(2)}
                    </Text>
                  </View>
                </View>

                  {/* Net Amount & Stats Card */}
                  {settings.incomeCalculationEnabled && summary && (
                  <Card style={{ backgroundColor: summary.netAmount >= 0 ? '#F0FDF4' : '#FEF2F2' }}>
                      <View className="flex-row items-center justify-between mb-4">
                      <View>
                        <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">Net Amount</Text>
                        <Text className={`
                          text-2xl font-bold
                          ${summary.netAmount >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'}
                        `}>
                          {getCurrencySymbol(settings.currency)}{summary.netAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>
                      </View>
                      <Ionicons 
                        name={summary.netAmount >= 0 ? "trending-up" : "trending-down"} 
                        size={32} 
                        color={summary.netAmount >= 0 ? "#10B981" : "#EF4444"} 
                      />
                    </View>
                      <View className="flex-row gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transactions</Text>
                          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {summary.transactionCount}
                          </Text>
                        </View>
                        {summary.totalIncome > 0 && (
                          <View className="flex-1">
                            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Savings Rate</Text>
                            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {((summary.netAmount / summary.totalIncome) * 100).toFixed(1)}%
                            </Text>
                          </View>
                        )}
                    </View>
                  </Card>
                )}
              </View>
            ) : null}

        {/* Daily Spending Patterns */}
        {dailyLoading && !dailyPatterns ? (
          <ChartSkeleton title="Daily Spending Patterns" height={180} />
        ) : dailyPatterns && dailyChartData && dailyChartData.length > 0 ? (
                <Card className="mb-6">
                  <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    Daily Spending Patterns
                  </Text>
                  {dailyChartData.some(d => d.value > 0) ? (
                    <SimpleBarChart
                      data={dailyChartData}
                      height={180}
                      showValues={true}
                      currencySymbol={getCurrencySymbol(settings.currency)}
                      animationKey={chartAnimationKey}
                    />
                  ) : (
                    <View className="py-8 items-center">
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        No spending data available for this period
                      </Text>
                    </View>
                  )}
                </Card>
              ) : null}

        {/* Monthly Trends */}
        {monthlyLoading && !monthlyTrends ? (
          <ChartSkeleton title="Monthly Trends" height={150} />
        ) : monthlyTrends && monthlyChartData && monthlyChartData.length > 0 ? (
                <Card className="mb-6">
                  <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    Monthly Trends
                  </Text>
                  <SimpleBarChart
                    data={monthlyChartData}
                    height={150}
                    showValues={true}
                    currencySymbol={getCurrencySymbol(settings.currency)}
                    animationKey={chartAnimationKey}
                  />
                </Card>
              ) : null}

        {/* Category Breakdown (Enhanced) */}
        {categoryLoading ? (
          <EnhancedBreakdownSkeleton title="Category Breakdown" />
        ) : categoryReport && categoryReport.length > 0 ? (
              <Card className="mb-6">
                <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    Category Breakdown
                </Text>
                <View className="gap-3">
                  {categoryReport.map((category, index) => {
                    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
                    const color = colors[index % colors.length];
                    
                    return (
                      <View key={category.categoryId}>
                        <View className="flex-row justify-between items-center mb-2">
                          <View className="flex-row items-center gap-2 flex-1">
                            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {category.categoryName}
                            </Text>
                            {category.isDeleted && (
                              <View className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                                <Text className="text-xs text-gray-600 dark:text-gray-400">
                                  Deleted
                                </Text>
                              </View>
                            )}
                          </View>
                          <View className="flex-row items-center gap-2">
                            <Text className="text-sm font-bold text-gray-900 dark:text-gray-100">
                              {getCurrencySymbol(settings.currency)}{category.amount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </Text>
                            <Text className="text-xs text-gray-500 dark:text-gray-400">
                              {category.percentage.toFixed(1)}%
                            </Text>
                          </View>
                        </View>
                        <AnimatedProgressBar
                          percentage={category.percentage}
                          color={color}
                          height={10}
                          animationKey={chartAnimationKey}
                          index={index}
                        />
                          <View className="flex-row justify-between items-center mt-1">
                            <Text className="text-xs text-gray-500 dark:text-gray-400">
                              {category.count} transactions
                            </Text>
                            <Text className="text-xs text-gray-500 dark:text-gray-400">
                              Avg: {getCurrencySymbol(settings.currency)}{(category.amount / category.count).toFixed(2)}
                            </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>
            ) : null}

        {/* Tags Breakdown (Enhanced) */}
        {tagLoading ? (
          <EnhancedBreakdownSkeleton title="Tags Breakdown" />
        ) : tagReport && tagReport.length > 0 ? (
              <Card className="mb-6">
                <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    Tags Breakdown
                </Text>
                <View className="gap-3">
                  {tagReport.map((tag, index) => {
                    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
                    const color = colors[index % colors.length];
                    
                    return (
                      <View key={tag.tagId}>
                        <View className="flex-row justify-between items-center mb-2">
                          <View className="flex-row items-center gap-2 flex-1">
                            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {tag.tagName}
                            </Text>
                            {tag.isDeleted && (
                              <View className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                                <Text className="text-xs text-gray-600 dark:text-gray-400">
                                  Deleted
                                </Text>
                              </View>
                            )}
                          </View>
                          <View className="flex-row items-center gap-2">
                            <Text className="text-sm font-bold text-gray-900 dark:text-gray-100">
                              {getCurrencySymbol(settings.currency)}{tag.amount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </Text>
                            <Text className="text-xs text-gray-500 dark:text-gray-400">
                              {tag.percentage.toFixed(1)}%
                            </Text>
                          </View>
                        </View>
                        <AnimatedProgressBar
                          percentage={tag.percentage}
                          color={color}
                          height={10}
                          animationKey={chartAnimationKey}
                          index={index}
                        />
                          <View className="flex-row justify-between items-center mt-1">
                            <Text className="text-xs text-gray-500 dark:text-gray-400">
                              {tag.count} transactions
                            </Text>
                            <Text className="text-xs text-gray-500 dark:text-gray-400">
                              Avg: {getCurrencySymbol(settings.currency)}{(tag.amount / tag.count).toFixed(2)}
                            </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>
            ) : null}

        {/* Account Report (Enhanced) */}
        {accountLoading && !accountReport ? (
          <AccountAnalysisSkeleton showIncome={settings.incomeCalculationEnabled} />
        ) : accountReport ? (
              <Card className="mb-6">
                <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                    Account Analysis
                </Text>
                {accountReport.length > 0 ? (
                  <View className="gap-4">
                    {accountReport.map((account) => (
                      <View key={account.accountId} className="pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-1">
                            <Text className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                              {account.accountName}
                            </Text>
                            <Text className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {account.accountType}
                            </Text>
                          </View>
                          <View className="items-end">
                            <Text className={`
                              text-lg font-bold
                              ${account.netAmount >= 0 
                                ? 'text-green-600' 
                                : 'text-red-600'}
                            `}>
                              {getCurrencySymbol(settings.currency)}{account.netAmount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </Text>
                            <Text className="text-xs text-gray-500 mt-0.5">Net</Text>
                          </View>
                        </View>
                        <View className="flex-row gap-4 mt-3">
                            <View className="flex-1">
                            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expenses</Text>
                            <Text className="text-sm font-semibold text-red-500">
                              {getCurrencySymbol(settings.currency)}{account.expenses.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </Text>
                          </View>
                          {settings.incomeCalculationEnabled && (
                            <View className="flex-1">
                              <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Income</Text>
                              <Text className="text-sm font-semibold text-green-500">
                                {getCurrencySymbol(settings.currency)}{account.income.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </Text>
                            </View>
                          )}
                            <View className="flex-1">
                              <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transactions</Text>
                              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {account.transactionCount}
                              </Text>
                            </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="py-8 items-center">
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      No account activity for this period
                    </Text>
                  </View>
                )}
              </Card>
            ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
