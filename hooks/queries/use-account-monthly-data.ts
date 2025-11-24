import { useQuery } from '@tanstack/react-query';
import { transactionRepository } from '@/repositories/transaction.repository';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format } from 'date-fns';
import { logPerformance } from '@/utils/logger';

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
      const startTime = Date.now();
      logPerformance(`useAccountMonthlyData(${accountId}) query started`, 0);
      
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

      // Use optimized methods that only fetch and decrypt amounts
      const [monthExpenses, todayExpenses] = await Promise.all([
        transactionRepository.calculateAccountExpensesForDateRange({
          accountIds: [accountId],
          startDate: monthStartDate,
          endDate: monthEndDate,
          types: ['expense'],
        }),
        transactionRepository.calculateAccountExpensesForDateRange({
          accountIds: [accountId],
          startDate: dayStartDate,
          endDate: dayEndDate,
          types: ['expense'],
        }),
      ]);

      const result = {
        accountId,
        currentMonthExpenses: monthExpenses,
        todayExpenses: todayExpenses,
      };
      
      const endTime = Date.now();
      logPerformance(`useAccountMonthlyData(${accountId}) query completed`, endTime - startTime);

      return result;
    },
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

