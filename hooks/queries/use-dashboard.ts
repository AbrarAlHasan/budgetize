import { useQuery } from '@tanstack/react-query';
import { transactionRepository } from '@/repositories/transaction.repository';
import { categoryRepository } from '@/repositories/category.repository';
import { Transaction } from '@/db/schema/types';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useUIStore } from '@/store/ui-store';
import { useSettingsStore } from '@/store/settings-store';
import { filterTransactionsByIncomePreference, incomePreferenceKey } from '@/utils/income-preference';

const QUERY_KEYS = {
  all: ['dashboard'] as const,
  monthly: (month: string) => [...QUERY_KEYS.all, 'monthly', month] as const,
  categoryBreakdown: (month: string) => [...QUERY_KEYS.all, 'category', month] as const,
};

interface DashboardData {
  totalSpending: number;
  totalIncome: number;
  netAmount: number;
  transactionCount: number;
}

interface CategoryBreakdown {
  categoryId: number;
  categoryName: string;
  amount: number;
  count: number;
}

export function useDashboardData(month?: Date, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters.dashboard);
  const incomeEnabled = useSettingsStore((state) => state.settings.incomeCalculationEnabled);
  const targetMonth = month || new Date();
  const monthKey = format(targetMonth, 'yyyy-MM');
  
  // Use filter dates if available, otherwise use month range
  const startDate = useFilters && filters.startDate 
    ? filters.startDate 
    : format(startOfMonth(targetMonth), 'yyyy-MM-dd');
  const endDate = useFilters && filters.endDate 
    ? filters.endDate 
    : format(endOfMonth(targetMonth), 'yyyy-MM-dd');

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.monthly(monthKey), 'filters', filters, incomePreferenceKey(incomeEnabled)]
      : [...QUERY_KEYS.monthly(monthKey), incomePreferenceKey(incomeEnabled)],
    queryFn: async (): Promise<DashboardData> => {
      const baseFilterOptions = useFilters ? {
        startDate,
        endDate,
        accountIds: filters.accountIds && filters.accountIds.length > 0 ? filters.accountIds : undefined,
        accountId: filters.accountId || undefined,
        tagIds: filters.tagIds && filters.tagIds.length > 0 ? filters.tagIds : undefined,
        tagId: filters.tagId || undefined,
        categoryIds: filters.categoryIds && filters.categoryIds.length > 0 ? filters.categoryIds : undefined,
        categoryId: filters.categoryId || undefined,
        types: filters.transactionTypes && filters.transactionTypes.length > 0 ? filters.transactionTypes : undefined,
        type: filters.transactionType || undefined,
        accountTypes: filters.accountTypes && filters.accountTypes.length > 0 ? filters.accountTypes : undefined,
        accountType: filters.accountType || undefined,
      } : { startDate, endDate };
      
      // If income is disabled, exclude income transactions from the query
      const filterOptions = !incomeEnabled && !baseFilterOptions.types
        ? { ...baseFilterOptions, types: ['expense'] as Transaction['type'][] }
        : baseFilterOptions;
      
      // Use optimized method that only fetches and decrypts amounts
      const totals = await transactionRepository.calculateSummaryTotals(filterOptions);

      // If income is disabled, ensure income totals are zero
      const finalTotals = !incomeEnabled
        ? { ...totals, totalIncome: 0, incomeCount: 0 }
        : totals;

      return {
        totalSpending: finalTotals.totalExpenses,
        totalIncome: finalTotals.totalIncome,
        netAmount: finalTotals.totalIncome - finalTotals.totalExpenses,
        transactionCount: finalTotals.transactionCount,
      };
    },
  });
}

export function useCategoryBreakdown(month?: Date, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters.dashboard);
  const incomeEnabled = useSettingsStore((state) => state.settings.incomeCalculationEnabled);
  const targetMonth = month || new Date();
  const monthKey = format(targetMonth, 'yyyy-MM');
  
  // Use filter dates if available, otherwise use month range
  const startDate = useFilters && filters.startDate 
    ? filters.startDate 
    : format(startOfMonth(targetMonth), 'yyyy-MM-dd');
  const endDate = useFilters && filters.endDate 
    ? filters.endDate 
    : format(endOfMonth(targetMonth), 'yyyy-MM-dd');

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.categoryBreakdown(monthKey), 'filters', filters, incomePreferenceKey(incomeEnabled)]
      : [...QUERY_KEYS.categoryBreakdown(monthKey), incomePreferenceKey(incomeEnabled)],
    queryFn: async (): Promise<CategoryBreakdown[]> => {
      const baseFilterOptions = useFilters ? {
        startDate,
        endDate,
        accountIds: filters.accountIds && filters.accountIds.length > 0 ? filters.accountIds : undefined,
        accountId: filters.accountId || undefined,
        tagIds: filters.tagIds && filters.tagIds.length > 0 ? filters.tagIds : undefined,
        tagId: filters.tagId || undefined,
        categoryIds: filters.categoryIds && filters.categoryIds.length > 0 ? filters.categoryIds : undefined,
        categoryId: filters.categoryId || undefined,
        types: filters.transactionTypes && filters.transactionTypes.length > 0 ? filters.transactionTypes : undefined,
        type: filters.transactionType || undefined,
        accountTypes: filters.accountTypes && filters.accountTypes.length > 0 ? filters.accountTypes : undefined,
        accountType: filters.accountType || undefined,
      } : { startDate, endDate };
      
      // Category breakdown only shows expenses, so filter to expenses
      const filterOptions = {
        ...baseFilterOptions,
        types: baseFilterOptions.types || ['expense'] as Transaction['type'][],
      };
      
      // Use optimized method that only fetches and decrypts amounts with category_id
      const categoryData = await transactionRepository.calculateCategoryBreakdown(filterOptions);

      // Fetch category names (only for categories that exist)
      const breakdown: CategoryBreakdown[] = [];
      const categoryIdsToFetch = categoryData
        .map((d) => d.categoryId)
        .filter((id): id is number => id !== null && id !== 0);

      // Batch fetch all categories at once
      const allCategories = categoryIdsToFetch.length > 0
        ? await categoryRepository.findByIds(categoryIdsToFetch)
        : [];
      
      // Decrypt all categories in parallel
      const decryptedCategories = await categoryRepository.decryptCategories(allCategories);
      
      const categoryMap = new Map(
        decryptedCategories.map((c) => [c.id, c])
      );

      // Build breakdown array
      for (const data of categoryData) {
        if (data.categoryId === null || data.categoryId === 0) {
          breakdown.push({
            categoryId: 0,
            categoryName: 'Uncategorized',
            amount: data.amount,
            count: data.count,
          });
        } else {
          const category = categoryMap.get(data.categoryId);
          breakdown.push({
            categoryId: data.categoryId,
            categoryName: category?.name || `Category ${data.categoryId}`,
            amount: data.amount,
            count: data.count,
          });
        }
      }

      return breakdown.sort((a, b) => b.amount - a.amount);
    },
  });
}

