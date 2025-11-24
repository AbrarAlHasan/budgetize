import { useQuery } from '@tanstack/react-query';
import { transactionRepository } from '@/repositories/transaction.repository';
import { startOfMonth, endOfMonth, format, differenceInDays, getDaysInMonth } from 'date-fns';
import { logPerformance } from '@/utils/logger';

const QUERY_KEY = ['accountSpendingVelocity'];

export interface AccountSpendingVelocity {
  accountId: number;
  currentMonthSpending: number;
  daysElapsed: number;
  daysRemaining: number;
  totalDaysInMonth: number;
  averageDailySpending: number;
  projectedMonthEndSpending: number;
  spendingRate: number; // Percentage of month elapsed
  spendingProgress: number; // Percentage of projected spending used
}

export function useAccountSpendingVelocity(accountId: number) {
  return useQuery({
    queryKey: [...QUERY_KEY, accountId],
    queryFn: async (): Promise<AccountSpendingVelocity> => {
      const startTime = Date.now();
      logPerformance(`useAccountSpendingVelocity(${accountId}) query started`, 0);
      
      const now = new Date();
      
      // Get current month range
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const monthStartDate = format(monthStart, 'yyyy-MM-dd');
      const monthEndDate = format(monthEnd, 'yyyy-MM-dd');

      // Calculate days
      const totalDaysInMonth = getDaysInMonth(now);
      const daysElapsed = differenceInDays(now, monthStart) + 1; // +1 to include today
      const daysRemaining = totalDaysInMonth - daysElapsed;

      // Use optimized method that only fetches and decrypts amounts
      const currentMonthSpending = await transactionRepository.calculateAccountExpensesForDateRange({
        accountIds: [accountId],
        startDate: monthStartDate,
        endDate: monthEndDate,
        types: ['expense'],
      });

      // Calculate metrics
      const averageDailySpending = daysElapsed > 0 ? currentMonthSpending / daysElapsed : 0;
      const projectedMonthEndSpending = averageDailySpending * totalDaysInMonth;
      const spendingRate = (daysElapsed / totalDaysInMonth) * 100; // % of month elapsed
      const spendingProgress = projectedMonthEndSpending > 0 
        ? (currentMonthSpending / projectedMonthEndSpending) * 100 
        : 0;

      const result = {
        accountId,
        currentMonthSpending,
        daysElapsed,
        daysRemaining,
        totalDaysInMonth,
        averageDailySpending,
        projectedMonthEndSpending,
        spendingRate,
        spendingProgress,
      };
      
      const endTime = Date.now();
      logPerformance(`useAccountSpendingVelocity(${accountId}) query completed`, endTime - startTime);

      return result;
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

