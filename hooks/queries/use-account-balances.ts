import { useQuery } from '@tanstack/react-query';
import { transactionRepository } from '@/repositories/transaction.repository';
import { useSettingsStore } from '@/store/settings-store';
import { incomePreferenceKey } from '@/utils/income-preference';
import { Transaction } from '@/db/schema/types';

const QUERY_KEYS = {
  all: ['account-balances'] as const,
  balances: () => [...QUERY_KEYS.all, 'balances'] as const,
};

export function useAccountBalances() {
  const incomeEnabled = useSettingsStore((state) => state.incomeCalculationEnabled);

  return useQuery({
    queryKey: [...QUERY_KEYS.balances(), incomePreferenceKey(incomeEnabled)],
    queryFn: async (): Promise<Map<number, number>> => {
      const startTime = Date.now();
      console.log('[Performance] useAccountBalances query started');
      
      // Use optimized method that only fetches and decrypts amounts with account_id and type
      // Filter by income preference in the query if needed
      const filterOptions = !incomeEnabled 
        ? { types: ['expense'] as Transaction['type'][] }
        : undefined;
      
      const accountBreakdown = await transactionRepository.calculateAccountBreakdown(filterOptions);

      // Build balance map from breakdown (balance = income - expenses)
      const balanceMap = new Map<number, number>();
      for (const item of accountBreakdown) {
        const balance = item.income - item.expenses;
        balanceMap.set(item.accountId, balance);
      }

      const endTime = Date.now();
      console.log(`[Performance] useAccountBalances query completed in ${endTime - startTime}ms`);

      return balanceMap;
    },
  });
}

