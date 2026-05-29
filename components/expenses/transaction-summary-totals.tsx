import { TransactionSummaryTotals } from '@/hooks/queries/use-transactions';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface TransactionSummaryTotalsProps {
  summary: TransactionSummaryTotals | undefined;
  currencySymbol: string;
  incomeEnabled: boolean;
  /** Initial load with no cached data. */
  isLoading: boolean;
  /** Background refetch (search/filter changed); keeps previous totals visible. */
  isFetching?: boolean;
}

function formatAmount(amount: number, currencySymbol: string): string {
  return `${currencySymbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function TransactionSummaryTotalsBarComponent({
  summary,
  currencySymbol,
  incomeEnabled,
  isLoading,
  isFetching = false,
}: TransactionSummaryTotalsProps) {
  if (isLoading && !summary) {
    return (
      <View className="mb-4 rounded-2xl bg-white dark:bg-gray-900 p-6 items-center justify-center min-h-[88px]">
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <View className="mb-4" style={{ opacity: isFetching ? 0.65 : 1 }}>
      <View className="flex-row gap-3 mb-3">
        <View
          className="flex-1 rounded-2xl p-4"
          style={{ backgroundColor: '#FEE2E2' }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Total expenses
            </Text>
            <Ionicons name="arrow-down" size={16} color="#EF4444" />
          </View>
          <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatAmount(summary.totalExpenses, currencySymbol)}
          </Text>
        </View>

        {incomeEnabled ? (
          <View
            className="flex-1 rounded-2xl p-4"
            style={{ backgroundColor: '#D1FAE5' }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Total income
              </Text>
              <Ionicons name="arrow-up" size={16} color="#10B981" />
            </View>
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatAmount(summary.totalIncome, currencySymbol)}
            </Text>
          </View>
        ) : null}
      </View>

      {incomeEnabled ? (
        <View
          className="rounded-2xl p-4"
          style={{
            backgroundColor: summary.netAmount >= 0 ? '#F0FDF4' : '#FEF2F2',
          }}
        >
          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Net amount
          </Text>
          <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatAmount(summary.netAmount, currencySymbol)}
          </Text>
        </View>
      ) : null}

      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
        {summary.transactionCount}{' '}
        {summary.transactionCount === 1 ? 'transaction' : 'transactions'}
        {isFetching ? ' · Updating…' : ' in this period'}
      </Text>
    </View>
  );
}

export const TransactionSummaryTotalsBar = React.memo(
  TransactionSummaryTotalsBarComponent
);
