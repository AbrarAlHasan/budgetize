import { useQuery } from '@tanstack/react-query';
import { transactionRepository } from '@/repositories/transaction.repository';
import { format, differenceInDays } from 'date-fns';
import { useUIStore } from '@/store/ui-store';

const QUERY_KEY = ['spendingVelocity'];

export interface SpendingVelocity {
  currentSpending: number;
  daysElapsed: number;
  daysRemaining: number;
  totalDaysInPeriod: number;
  averageDailySpending: number;
  projectedPeriodEndSpending: number;
  spendingRate: number; // Percentage of period elapsed
  spendingProgress: number; // Percentage of projected spending used
}

export function useSpendingVelocity(
  startDate: string,
  endDate: string,
  useFilters: boolean = false
) {
  const filters = useUIStore((state) => state.filters.reports);

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEY, startDate, endDate, 'filters', filters]
      : [...QUERY_KEY, startDate, endDate],
    queryFn: async (): Promise<SpendingVelocity> => {
      const periodStart = new Date(startDate);
      const periodEnd = new Date(endDate);
      const now = new Date();
      
      // Use current date if it's before period end
      const actualEndDate = now < periodEnd ? now : periodEnd;

      // Calculate days
      const totalDaysInPeriod = differenceInDays(periodEnd, periodStart) + 1;
      const daysElapsed = differenceInDays(actualEndDate, periodStart) + 1; // +1 to include today
      const daysRemaining = totalDaysInPeriod - daysElapsed;

      const filterOptions = useFilters && filters ? {
        startDate,
        endDate: format(actualEndDate, 'yyyy-MM-dd'),
        accountIds: filters.accountIds && filters.accountIds.length > 0 ? filters.accountIds : undefined,
        accountId: filters.accountId || undefined,
        tagIds: filters.tagIds && filters.tagIds.length > 0 ? filters.tagIds : undefined,
        tagId: filters.tagId || undefined,
        categoryIds: filters.categoryIds && filters.categoryIds.length > 0 ? filters.categoryIds : undefined,
        categoryId: filters.categoryId || undefined,
        types: ['expense'] as const,
        transactionTypes: filters.transactionTypes && filters.transactionTypes.length > 0 ? filters.transactionTypes : undefined,
        accountTypes: filters.accountTypes && filters.accountTypes.length > 0 ? filters.accountTypes : undefined,
        accountType: filters.accountType || undefined,
      } : {
        startDate,
        endDate: format(actualEndDate, 'yyyy-MM-dd'),
        types: ['expense'] as const,
      };

      // Use optimized method that only fetches and decrypts amounts
      const currentSpending = await transactionRepository.calculateAccountExpensesForDateRange({
        accountIds: filterOptions.accountIds,
        accountId: filterOptions.accountId,
        startDate: filterOptions.startDate,
        endDate: filterOptions.endDate,
        types: ['expense'],
      });

      // Calculate metrics
      const averageDailySpending = daysElapsed > 0 ? currentSpending / daysElapsed : 0;
      const projectedPeriodEndSpending = averageDailySpending * totalDaysInPeriod;
      const spendingRate = (daysElapsed / totalDaysInPeriod) * 100; // % of period elapsed
      const spendingProgress = projectedPeriodEndSpending > 0 
        ? (currentSpending / projectedPeriodEndSpending) * 100 
        : 0;

      return {
        currentSpending,
        daysElapsed,
        daysRemaining,
        totalDaysInPeriod,
        averageDailySpending,
        projectedPeriodEndSpending,
        spendingRate,
        spendingProgress,
      };
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

