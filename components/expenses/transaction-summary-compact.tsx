import { TransactionSummaryTotals } from '@/hooks/queries/use-transactions';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface TransactionSummaryCompactProps {
  summary: TransactionSummaryTotals | undefined;
  currencySymbol: string;
  incomeEnabled: boolean;
  isLoading: boolean;
  isFetching?: boolean;
}

function formatAmount(amount: number, currencySymbol: string): string {
  return `${currencySymbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function TransactionSummaryCompactComponent({
  summary,
  currencySymbol,
  incomeEnabled,
  isLoading,
  isFetching = false,
}: TransactionSummaryCompactProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const cardStyle = {
    backgroundColor: isDark ? '#111827' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? '#1F2937' : '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.25 : 0.06,
    shadowRadius: 10,
    elevation: 2,
  };

  const dividerColor = isDark ? '#1F2937' : '#F3F4F6';
  const labelColor = isDark ? '#9CA3AF' : '#6B7280';
  const footerColor = isDark ? '#9CA3AF' : '#6B7280';

  const statCell = (
    label: string,
    value: string,
    valueColor: string
  ): React.ReactNode => (
    <View className="flex-1 px-3 py-3">
      <Text
        className="text-[10px] font-semibold uppercase tracking-wider mb-1"
        style={{ color: labelColor }}
      >
        {label}
      </Text>
      <Text
        className="text-[15px] font-bold"
        style={{ color: valueColor }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>
    </View>
  );

  if (isLoading && !summary) {
    return (
      <View
        className="rounded-2xl items-center justify-center min-h-[60px]"
        style={cardStyle}
      >
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  }

  if (!summary) {
    return null;
  }

  const countLabel = `${summary.transactionCount} ${
    summary.transactionCount === 1 ? 'transaction' : 'transactions'
  }`;
  const footerText = `${countLabel}${isFetching ? ' · Updating…' : ' in this period'}`;

  if (!incomeEnabled) {
    return null;
  }

  return (
    <View style={{ opacity: isFetching ? 0.7 : 1 }}>
      <View className="rounded-2xl overflow-hidden" style={cardStyle}>
        <View className="flex-row">
          {statCell(
            'Expenses',
            formatAmount(summary.totalExpenses, currencySymbol),
            isDark ? '#FCA5A5' : '#DC2626'
          )}
          <View className="w-px" style={{ backgroundColor: dividerColor }} />
          {statCell(
            'Income',
            formatAmount(summary.totalIncome, currencySymbol),
            isDark ? '#6EE7B7' : '#059669'
          )}
          <View className="w-px" style={{ backgroundColor: dividerColor }} />
          {statCell(
            'Net',
            formatAmount(summary.netAmount, currencySymbol),
            summary.netAmount >= 0
              ? isDark
                ? '#6EE7B7'
                : '#059669'
              : isDark
                ? '#FCA5A5'
                : '#DC2626'
          )}
        </View>
      </View>
      <Text className="text-xs mt-2 text-center" style={{ color: footerColor }}>
        {footerText}
      </Text>
    </View>
  );
}

export const TransactionSummaryCompact = React.memo(
  TransactionSummaryCompactComponent
);
