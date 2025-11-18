import { DatePicker } from '@/components/date-picker';
import { Card } from '@/components/ui/card';
import { useAccountReport, useCategoryReport, useReportSummary } from '@/hooks/queries/use-reports';
import { useSettingsStore } from '@/store/settings-store';
import { useUIStore } from '@/store/ui-store';
import { getCurrencySymbol } from '@/utils/currencies';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReportsScreen() {
  const queryClient = useQueryClient();
  const filters = useUIStore((state) => state.filters.reports);
  const setCurrentFilterContext = useUIStore((state) => state.setCurrentFilterContext);
  const { settings, loadSettings } = useSettingsStore();
  const [useFilters, setUseFilters] = useState(false);
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    loadSettings();
  }, []);

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  const { data: summary, isLoading: summaryLoading } = useReportSummary(startDateStr, endDateStr, useFilters);
  const { data: categoryReport, isLoading: categoryLoading } = useCategoryReport(startDateStr, endDateStr, useFilters);
  const { data: accountReport, isLoading: accountLoading } = useAccountReport(startDateStr, endDateStr, useFilters);

  const isLoading = summaryLoading || categoryLoading || accountLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, startDateStr, endDateStr]);

  const handleApplyFilters = () => {
    setUseFilters(true);
    queryClient.invalidateQueries({ queryKey: ['reports'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const hasActiveFilters = 
    filters.accountId !== null ||
    filters.tagId !== null ||
    filters.startDate !== null ||
    filters.endDate !== null ||
    filters.transactionType !== null ||
    filters.accountType !== null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950" edges={['top']}>
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
              Financial insights
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

        {/* Date Range Picker */}
        <Card className="mb-6">
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Date Range
          </Text>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={setEndDate}
          />
        </Card>

        {isLoading ? (
          <View className="items-center justify-center py-8">
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <>
            {/* Summary */}
            {summary && (
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
                        {getCurrencySymbol(settings.currency)}{summary.totalIncome.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
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
                    <Text className="text-2xl font-bold text-gray-900">
                      {getCurrencySymbol(settings.currency)}{summary.totalExpenses.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                </View>

                {/* Net Amount Card - Only show if income calculation is enabled */}
                {settings.incomeCalculationEnabled && (
                  <Card style={{ backgroundColor: summary.netAmount >= 0 ? '#F0FDF4' : '#FEF2F2' }}>
                    <View className="flex-row items-center justify-between">
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
                        <Text className="text-xs text-gray-500 mt-1">
                          {summary.transactionCount} transactions
                        </Text>
                      </View>
                      <Ionicons 
                        name={summary.netAmount >= 0 ? "trending-up" : "trending-down"} 
                        size={32} 
                        color={summary.netAmount >= 0 ? "#10B981" : "#EF4444"} 
                      />
                    </View>
                  </Card>
                )}
              </View>
            )}

            {/* Category Report */}
            {categoryReport && categoryReport.length > 0 && (
              <Card className="mb-6">
                <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  By Category
                </Text>
                <View className="gap-3">
                  {categoryReport.map((category, index) => {
                    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
                    const color = colors[index % colors.length];
                    
                    return (
                      <View key={category.tagId}>
                        <View className="flex-row justify-between items-center mb-2">
                          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {category.tagName}
                          </Text>
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
                        <View className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <View
                            className="h-full rounded-full"
                            style={{ 
                              width: `${Math.min(category.percentage, 100)}%`,
                              backgroundColor: color,
                            }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>
            )}

            {/* Account Report */}
            {accountReport && accountReport.length > 0 && (
              <Card>
                <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  By Account
                </Text>
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
                        <View className={settings.incomeCalculationEnabled ? "flex-1" : "flex-1"}>
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
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            )}
          </>
        )}
        </View>
      </ScrollView>
      
    </SafeAreaView>
  );
}

