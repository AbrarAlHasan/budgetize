import { useQuery } from '@tanstack/react-query';
import { transactionRepository } from '@/repositories/transaction.repository';
import { useSettingsStore } from '@/store/settings-store';
import { filterTransactionsByIncomePreference, incomePreferenceKey } from '@/utils/income-preference';

const QUERY_KEYS = {
  all: ['account-balances'] as const,
  balances: () => [...QUERY_KEYS.all, 'balances'] as const,
};

export function useAccountBalances() {
  const incomeEnabled = useSettingsStore((state) => state.incomeCalculationEnabled);

  return useQuery({
    queryKey: [...QUERY_KEYS.balances(), incomePreferenceKey(incomeEnabled)],
    queryFn: async (): Promise<Map<number, number>> => {
      const transactions = await transactionRepository.findAll();
      const decrypted = await transactionRepository.decryptTransactions(transactions);
      const relevantTransactions = filterTransactionsByIncomePreference(decrypted, incomeEnabled);

      const balanceMap = new Map<number, number>();

      for (const transaction of relevantTransactions) {
        const amount = typeof transaction.amount === 'number' 
          ? transaction.amount 
          : parseFloat(String(transaction.amount)) || 0;
        
        const currentBalance = balanceMap.get(transaction.account_id) || 0;
        
        if (transaction.type === 'income') {
          balanceMap.set(transaction.account_id, currentBalance + amount);
        } else {
          balanceMap.set(transaction.account_id, currentBalance - amount);
        }
      }

      return balanceMap;
    },
  });
}

