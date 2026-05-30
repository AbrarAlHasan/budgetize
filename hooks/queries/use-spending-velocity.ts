import type { TransactionType } from '@/db/schema/types';
import { useQuery } from '@tanstack/react-query';
import { transactionRepository } from '@/repositories/transaction.repository';
import {
  deriveSpendingVelocityMetrics,
  type SpendingVelocityResult,
} from '@/utils/spending-velocity';
import { format, differenceInDays, subDays, addDays, min } from 'date-fns';
import { useUIStore } from '@/store/ui-store';

const QUERY_KEY = ['spendingVelocity'];
const EXPENSE_TYPES: TransactionType[] = ['expense'];

export type SpendingVelocity = SpendingVelocityResult;

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

      const actualEndDate = now < periodEnd ? now : periodEnd;

      const totalDaysInPeriod = differenceInDays(periodEnd, periodStart) + 1;
      const daysElapsed = differenceInDays(actualEndDate, periodStart) + 1;

      const priorPeriodEnd = subDays(periodStart, 1);
      const priorPeriodStart = subDays(periodStart, totalDaysInPeriod);
      const priorStartStr = format(priorPeriodStart, 'yyyy-MM-dd');
      const priorElapsedEnd = min([
        addDays(priorPeriodStart, daysElapsed - 1),
        priorPeriodEnd,
      ]);
      const priorToDateEndStr = format(priorElapsedEnd, 'yyyy-MM-dd');

      const filterOptions =
        useFilters && filters
          ? {
              startDate,
              endDate: format(actualEndDate, 'yyyy-MM-dd'),
              accountIds:
                filters.accountIds && filters.accountIds.length > 0
                  ? filters.accountIds
                  : undefined,
              accountId: filters.accountId || undefined,
              tagIds:
                filters.tagIds && filters.tagIds.length > 0
                  ? filters.tagIds
                  : undefined,
              tagId: filters.tagId || undefined,
              categoryIds:
                filters.categoryIds && filters.categoryIds.length > 0
                  ? filters.categoryIds
                  : undefined,
              categoryId: filters.categoryId || undefined,
              types: ['expense'] as const,
              transactionTypes:
                filters.transactionTypes &&
                filters.transactionTypes.length > 0
                  ? filters.transactionTypes
                  : undefined,
              accountTypes:
                filters.accountTypes && filters.accountTypes.length > 0
                  ? filters.accountTypes
                  : undefined,
              accountType: filters.accountType || undefined,
            }
          : {
              startDate,
              endDate: format(actualEndDate, 'yyyy-MM-dd'),
              types: ['expense'] as const,
            };

      const expenseFilter = {
        accountIds: filterOptions.accountIds,
        accountId: filterOptions.accountId,
        types: ['expense'] as const,
      };

      const [currentSpending, activeSpendingDays, priorToDateSpending] =
        await Promise.all([
          transactionRepository.calculateAccountExpensesForDateRange({
            ...expenseFilter,
            startDate: filterOptions.startDate,
            endDate: filterOptions.endDate,
          }),
          transactionRepository.countDistinctExpenseDates({
            ...expenseFilter,
            startDate: filterOptions.startDate,
            endDate: filterOptions.endDate,
          }),
          transactionRepository.calculateAccountExpensesForDateRange({
            ...expenseFilter,
            startDate: priorStartStr,
            endDate: priorToDateEndStr,
          }),
        ]);

      return deriveSpendingVelocityMetrics({
        currentSpending,
        daysElapsed,
        totalDaysInPeriod,
        activeSpendingDays,
        priorToDateSpending,
      });
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}
