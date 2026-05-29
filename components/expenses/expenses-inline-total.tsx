import { TransactionSummaryTotals } from '@/hooks/queries/use-transactions';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface ExpensesInlineTotalProps {
  summary: TransactionSummaryTotals | undefined;
  currencySymbol: string;
  isLoading: boolean;
  isFetching?: boolean;
}

function formatAmount(amount: number, currencySymbol: string): string {
  return `${currencySymbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ExpensesInlineTotalComponent({
  summary,
  currencySymbol,
  isLoading,
  isFetching = false,
}: ExpensesInlineTotalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const containerStyle = {
    backgroundColor: isDark ? '#111827' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? '#1F2937' : '#E5E7EB',
    opacity: isFetching ? 0.7 : 1,
  };

  if (isLoading && !summary) {
    return (
      <View
        className="rounded-2xl px-3 items-center justify-center min-w-[100px]"
        style={{ ...containerStyle, minHeight: 44 }}
      >
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  }

  if (!summary) {
    return null;
  }

  const amountLabel = formatAmount(summary.totalExpenses, currencySymbol);

  return (
    <View
      className="rounded-2xl px-3 py-2.5 justify-center items-end min-w-[100px] max-w-[132px]"
      style={containerStyle}
      accessibilityRole="text"
      accessibilityLabel={`Total expenses ${amountLabel}`}
    >
      <Text
        className="text-[9px] font-semibold uppercase tracking-wider mb-0.5"
        style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
      >
        Expenses
      </Text>
      <Text
        className="text-[13px] font-bold"
        style={{ color: isDark ? '#FCA5A5' : '#DC2626' }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
      >
        {amountLabel}
      </Text>
    </View>
  );
}

export const ExpensesInlineTotal = React.memo(ExpensesInlineTotalComponent);
