import type { TransactionType } from "@/db/schema/types";
import { transactionRepository } from "@/repositories/transaction.repository";
import { logPerformance } from "@/utils/logger";
import {
    deriveSpendingVelocityMetrics,
    type SpendingVelocityResult,
} from "@/utils/spending-velocity";
import { useQuery } from "@tanstack/react-query";
import {
    addDays,
    differenceInDays,
    endOfMonth,
    format,
    getDaysInMonth,
    min,
    startOfMonth,
    subDays,
} from "date-fns";

const QUERY_KEY = ["accountSpendingVelocity"];
const EXPENSE_TYPES: TransactionType[] = ["expense"];

export interface AccountSpendingVelocity extends SpendingVelocityResult {
  accountId: number;
}

export function useAccountSpendingVelocity(accountId: number) {
  return useQuery({
    queryKey: [...QUERY_KEY, accountId],
    queryFn: async (): Promise<AccountSpendingVelocity> => {
      const startTime = Date.now();

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const monthStartDate = format(monthStart, "yyyy-MM-dd");
      const monthEndDate = format(monthEnd, "yyyy-MM-dd");

      const totalDaysInPeriod = getDaysInMonth(now);
      const daysElapsed = differenceInDays(now, monthStart) + 1;

      const priorPeriodEnd = subDays(monthStart, 1);
      const priorPeriodStart = subDays(monthStart, totalDaysInPeriod);
      const priorStartStr = format(priorPeriodStart, "yyyy-MM-dd");
      const priorElapsedEnd = min([
        addDays(priorPeriodStart, daysElapsed - 1),
        priorPeriodEnd,
      ]);
      const priorToDateEndStr = format(priorElapsedEnd, "yyyy-MM-dd");

      const expenseFilter = {
        accountIds: [accountId],
        types: ["expense"] as TransactionType[],
      };

      const [currentSpending, activeSpendingDays, priorToDateSpending] =
        await Promise.all([
          transactionRepository.calculateAccountExpensesForDateRange({
            ...expenseFilter,
            startDate: monthStartDate,
            endDate: monthEndDate,
          }),
          transactionRepository.countDistinctExpenseDates({
            ...expenseFilter,
            startDate: monthStartDate,
            endDate: monthEndDate,
          }),
          transactionRepository.calculateAccountExpensesForDateRange({
            ...expenseFilter,
            startDate: priorStartStr,
            endDate: priorToDateEndStr,
          }),
        ]);

      const metrics = deriveSpendingVelocityMetrics({
        currentSpending,
        daysElapsed,
        totalDaysInPeriod,
        activeSpendingDays,
        priorToDateSpending,
      });

      const endTime = Date.now();
      logPerformance("useAccountSpendingVelocity_query", endTime - startTime);

      return {
        accountId,
        ...metrics,
      };
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });
}
