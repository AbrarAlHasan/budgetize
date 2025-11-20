import { useQuery } from '@tanstack/react-query';
import { transactionRepository } from '@/repositories/transaction.repository';

const QUERY_KEYS = {
  all: ['account-balances'] as const,
  balances: () => [...QUERY_KEYS.all, 'balances'] as const,
};

export function useAccountBalances() {
  return useQuery({
    queryKey: QUERY_KEYS.balances(),
    queryFn: async (): Promise<Map<number, number>> => {
      // Get all transactions
      const transactions = await transactionRepository.findAll();
      const decrypted = await transactionRepository.decryptTransactions(transactions);

      // Calculate balance for each account
      const balanceMap = new Map<number, number>();

      for (const transaction of decrypted) {
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

