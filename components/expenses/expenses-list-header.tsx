import { TransactionSummaryTotals } from '@/hooks/queries/use-transactions';
import { TransactionSummaryCompact } from '@/components/expenses/transaction-summary-compact';
import React from 'react';
import { View } from 'react-native';

interface ExpensesListHeaderProps {
  summary: TransactionSummaryTotals | undefined;
  currencySymbol: string;
  incomeEnabled: boolean;
  isLoading: boolean;
  isFetching: boolean;
}

function ExpensesListHeaderComponent({
  summary,
  currencySymbol,
  incomeEnabled,
  isLoading,
  isFetching,
}: ExpensesListHeaderProps) {
  return (
    <View className="px-5 pt-2 pb-3">
      <TransactionSummaryCompact
        summary={summary}
        currencySymbol={currencySymbol}
        incomeEnabled={incomeEnabled}
        isLoading={isLoading}
        isFetching={isFetching}
      />
    </View>
  );
}

export const ExpensesListHeader = React.memo(ExpensesListHeaderComponent);
