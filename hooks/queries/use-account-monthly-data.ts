import { useQuery } from '@tanstack/react-query';
import { transactionRepository } from '@/repositories/transaction.repository';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format } from 'date-fns';

const QUERY_KEY = ['accountMonthlyData'];

export interface AccountMonthlyData {
  accountId: number;
  currentMonthExpenses: number;
  todayExpenses: number;
}

export function useAccountMonthlyData(accountId: number) {
  return useQuery({
    queryKey: [...QUERY_KEY, accountId],
    queryFn: async (): Promise<AccountMonthlyData> => {
      const now = new Date();
      
      // Get current month range
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const monthStartDate = format(monthStart, 'yyyy-MM-dd');
      const monthEndDate = format(monthEnd, 'yyyy-MM-dd');

      // Get today's range
      const dayStart = startOfDay(now);
      const dayEnd = endOfDay(now);
      const dayStartDate = format(dayStart, 'yyyy-MM-dd');
      const dayEndDate = format(dayEnd, 'yyyy-MM-dd');

      // Fetch monthly expenses
      const monthTransactions = await transactionRepository.findAllWithFilters({
        accountIds: [accountId],
        startDate: monthStartDate,
        endDate: monthEndDate,
        types: ['expense'],
      });
      
      // Fetch today's expenses
      const todayTransactions = await transactionRepository.findAllWithFilters({
        accountIds: [accountId],
        startDate: dayStartDate,
        endDate: dayEndDate,
        types: ['expense'],
      });
      
      const decryptedMonth = await transactionRepository.decryptTransactions(monthTransactions);
      const decryptedToday = await transactionRepository.decryptTransactions(todayTransactions);

      let monthExpenses = 0;
      let todayExpenses = 0;

      for (const transaction of decryptedMonth) {
        const amount = typeof transaction.amount === 'number' 
          ? transaction.amount 
          : parseFloat(String(transaction.amount)) || 0;
        monthExpenses += amount;
      }

      for (const transaction of decryptedToday) {
        const amount = typeof transaction.amount === 'number' 
          ? transaction.amount 
          : parseFloat(String(transaction.amount)) || 0;
        todayExpenses += amount;
      }

      return {
        accountId,
        currentMonthExpenses: monthExpenses,
        todayExpenses: todayExpenses,
      };
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

