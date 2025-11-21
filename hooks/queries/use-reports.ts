import { accountRepository } from '@/repositories/account.repository';
import { categoryRepository } from '@/repositories/category.repository';
import { tagRepository } from '@/repositories/tag.repository';
import { transactionTagRepository } from '@/repositories/transaction-tag.repository';
import { transactionRepository } from '@/repositories/transaction.repository';
import { Transaction } from '@/db/schema/types';
import { useUIStore } from '@/store/ui-store';
import { useSettingsStore } from '@/store/settings-store';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, eachMonthOfInterval, endOfMonth, format, startOfMonth, subDays, subMonths } from 'date-fns';
import { filterTransactionsByIncomePreference, incomePreferenceKey } from '@/utils/income-preference';

const QUERY_KEYS = {
  all: ['reports'] as const,
  summary: (startDate: string, endDate: string) => 
    [...QUERY_KEYS.all, 'summary', startDate, endDate] as const,
  byCategory: (startDate: string, endDate: string) => 
    [...QUERY_KEYS.all, 'category', startDate, endDate] as const,
  byTag: (startDate: string, endDate: string) => 
    [...QUERY_KEYS.all, 'tag', startDate, endDate] as const,
  byAccount: (startDate: string, endDate: string) => 
    [...QUERY_KEYS.all, 'account', startDate, endDate] as const,
  periodComparison: (startDate: string, endDate: string) =>
    [...QUERY_KEYS.all, 'comparison', startDate, endDate] as const,
  dailyPatterns: (startDate: string, endDate: string) =>
    [...QUERY_KEYS.all, 'daily', startDate, endDate] as const,
  monthlyTrends: (startDate: string, endDate: string) =>
    [...QUERY_KEYS.all, 'monthly', startDate, endDate] as const,
};

export interface ReportSummary {
  totalExpenses: number;
  totalIncome: number;
  netAmount: number;
  transactionCount: number;
  averageExpense: number;
  averageIncome: number;
}

export interface CategoryReport {
  categoryId: number;
  categoryName: string;
  amount: number;
  count: number;
  percentage: number;
  isDeleted?: boolean;
}

export interface TagReport {
  tagId: number;
  tagName: string;
  amount: number;
  count: number;
  percentage: number;
  isDeleted?: boolean;
}

export interface AccountReport {
  accountId: number;
  accountName: string;
  accountType: string;
  expenses: number;
  income: number;
  netAmount: number;
  transactionCount: number;
}

export interface PeriodComparison {
  current: ReportSummary;
  previous: ReportSummary;
  changes: {
    incomeChange: number;
    incomeChangePercent: number;
    expenseChange: number;
    expenseChangePercent: number;
    netChange: number;
    netChangePercent: number;
    transactionCountChange: number;
    transactionCountChangePercent: number;
  };
}

export interface DailyPattern {
  dayOfWeek: string;
  dayIndex: number;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
}

export interface MonthlyTrend {
  month: string;
  monthIndex: number;
  totalExpenses: number;
  totalIncome: number;
  netAmount: number;
  transactionCount: number;
}


export function useReportSummary(startDate: string, endDate: string, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters.reports);
  const incomeEnabled = useSettingsStore((state) => state.incomeCalculationEnabled);
  
  // Use filter dates if available, otherwise use provided dates
  const filterStartDate = useFilters && filters.startDate ? filters.startDate : startDate;
  const filterEndDate = useFilters && filters.endDate ? filters.endDate : endDate;

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.summary(filterStartDate, filterEndDate), 'filters', filters, incomePreferenceKey(incomeEnabled)]
      : [...QUERY_KEYS.summary(filterStartDate, filterEndDate), incomePreferenceKey(incomeEnabled)],
    queryFn: async (): Promise<ReportSummary> => {
      const startTime = Date.now();
      console.log('[Performance] ReportSummary query started');
      
      const baseFilterOptions = useFilters ? {
        startDate: filterStartDate,
        endDate: filterEndDate,
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
      } : { startDate: filterStartDate, endDate: filterEndDate };
      
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

      const result = {
        totalExpenses: finalTotals.totalExpenses,
        totalIncome: finalTotals.totalIncome,
        netAmount: finalTotals.totalIncome - finalTotals.totalExpenses,
        transactionCount: finalTotals.transactionCount,
        averageExpense: finalTotals.expenseCount > 0 ? finalTotals.totalExpenses / finalTotals.expenseCount : 0,
        averageIncome: finalTotals.incomeCount > 0 ? finalTotals.totalIncome / finalTotals.incomeCount : 0,
      };
      
      const endTime = Date.now();
      console.log(`[Performance] ReportSummary query completed in ${endTime - startTime}ms`);
      
      return result;
    },
    enabled: !!filterStartDate && !!filterEndDate,
  });
}

export function useCategoryReport(startDate: string, endDate: string, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters.reports);
  const incomeEnabled = useSettingsStore((state) => state.incomeCalculationEnabled);
  
  // Use filter dates if available, otherwise use provided dates
  const filterStartDate = useFilters && filters.startDate ? filters.startDate : startDate;
  const filterEndDate = useFilters && filters.endDate ? filters.endDate : endDate;

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.byCategory(filterStartDate, filterEndDate), 'filters', filters, incomePreferenceKey(incomeEnabled)]
      : [...QUERY_KEYS.byCategory(filterStartDate, filterEndDate), incomePreferenceKey(incomeEnabled)],
    queryFn: async (): Promise<CategoryReport[]> => {
      const startTime = Date.now();
      console.log('[Performance] CategoryReport query started');
      
      const filterOptions = useFilters ? {
        startDate: filterStartDate,
        endDate: filterEndDate,
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
      } : { startDate: filterStartDate, endDate: filterEndDate };
      
      // Use optimized method that only fetches and decrypts amounts with category_id
      const categoryBreakdown = await transactionRepository.calculateCategoryBreakdown(filterOptions);

      // Calculate total expenses for percentage calculation
      const totalExpenses = categoryBreakdown.reduce((sum, item) => sum + item.amount, 0);

      // Fetch category names
      const reports: CategoryReport[] = [];

      for (const item of categoryBreakdown) {
        if (item.categoryId === null || item.categoryId === 0) {
          reports.push({
            categoryId: 0,
            categoryName: 'Uncategorized',
            amount: item.amount,
            count: item.count,
            percentage: totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0,
            isDeleted: false,
          });
        } else {
          const category = await categoryRepository.findById(item.categoryId);
          const decryptedCategory = category ? await categoryRepository.decryptCategory(category) : null;
          reports.push({
            categoryId: item.categoryId,
            categoryName: decryptedCategory?.name || `Category ${item.categoryId}`,
            amount: item.amount,
            count: item.count,
            percentage: totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0,
            isDeleted: category?.deleted_at !== null,
          });
        }
      }

      const result = reports.sort((a, b) => b.amount - a.amount);
      
      const endTime = Date.now();
      console.log(`[Performance] CategoryReport query completed in ${endTime - startTime}ms`);
      
      return result;
    },
    enabled: !!filterStartDate && !!filterEndDate,
  });
}

export function useTagReport(startDate: string, endDate: string, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters.reports);
  const incomeEnabled = useSettingsStore((state) => state.incomeCalculationEnabled);
  
  // Use filter dates if available, otherwise use provided dates
  const filterStartDate = useFilters && filters.startDate ? filters.startDate : startDate;
  const filterEndDate = useFilters && filters.endDate ? filters.endDate : endDate;

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.byTag(filterStartDate, filterEndDate), 'filters', filters, incomePreferenceKey(incomeEnabled)]
      : [...QUERY_KEYS.byTag(filterStartDate, filterEndDate), incomePreferenceKey(incomeEnabled)],
    queryFn: async (): Promise<TagReport[]> => {
      const startTime = Date.now();
      console.log('[Performance] TagReport query started');
      
      const filterOptions = useFilters ? {
        startDate: filterStartDate,
        endDate: filterEndDate,
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
      } : { startDate: filterStartDate, endDate: filterEndDate };
      
      // Use optimized method that only fetches and decrypts amounts with tag_id
      const tagBreakdown = await transactionRepository.calculateTagBreakdown(filterOptions);

      // Calculate total tagged expenses for percentage (may be > totalExpenses due to multi-tag transactions)
      const totalTaggedExpenses = tagBreakdown.reduce((sum, item) => sum + item.amount, 0);

      // Fetch tag names
      const reports: TagReport[] = [];

      for (const item of tagBreakdown) {
        if (item.tagId === null || item.tagId === 0) {
          reports.push({
            tagId: 0,
            tagName: 'Untagged',
            amount: item.amount,
            count: item.count,
            percentage: totalTaggedExpenses > 0 ? (item.amount / totalTaggedExpenses) * 100 : 0,
            isDeleted: false,
          });
        } else {
          // Fetch tag including deleted ones for reports
          const tag = await tagRepository.findByIdIncludingDeleted(item.tagId);
          const decryptedTag = tag ? await tagRepository.decryptTag(tag) : null;
          reports.push({
            tagId: item.tagId,
            tagName: decryptedTag?.name || `Tag ${item.tagId}`,
            amount: item.amount,
            count: item.count,
            percentage: totalTaggedExpenses > 0 ? (item.amount / totalTaggedExpenses) * 100 : 0,
            isDeleted: tag?.deleted_at !== null,
          });
        }
      }

      const result = reports.sort((a, b) => b.amount - a.amount);
      
      const endTime = Date.now();
      console.log(`[Performance] TagReport query completed in ${endTime - startTime}ms`);
      
      return result;
    },
    enabled: !!filterStartDate && !!filterEndDate,
  });
}

export function useAccountReport(startDate: string, endDate: string, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters.reports);
  const incomeEnabled = useSettingsStore((state) => state.incomeCalculationEnabled);
  
  // Use filter dates if available, otherwise use provided dates
  const filterStartDate = useFilters && filters.startDate ? filters.startDate : startDate;
  const filterEndDate = useFilters && filters.endDate ? filters.endDate : endDate;

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.byAccount(filterStartDate, filterEndDate), 'filters', filters, incomePreferenceKey(incomeEnabled)]
      : [...QUERY_KEYS.byAccount(filterStartDate, filterEndDate), incomePreferenceKey(incomeEnabled)],
    queryFn: async (): Promise<AccountReport[]> => {
      const startTime = Date.now();
      console.log('[Performance] AccountReport query started');
      
      const filterOptions = useFilters ? {
        startDate: filterStartDate,
        endDate: filterEndDate,
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
      } : { startDate: filterStartDate, endDate: filterEndDate };
      
      // Use optimized method that only fetches and decrypts amounts with account_id and type
      // Filter by income preference in the query if needed
      const accountBreakdownFilterOptions = !incomeEnabled 
        ? { ...filterOptions, types: ['expense'] as Transaction['type'][] }
        : filterOptions;
      
      const accountBreakdown = await transactionRepository.calculateAccountBreakdown(accountBreakdownFilterOptions);

      // Fetch all accounts (not just those with transactions)
      const accounts = await accountRepository.findAll();
      const decryptedAccounts = await accountRepository.decryptAccounts(accounts);
      
      // Create a map of account breakdown data by account ID
      const breakdownMap = new Map(accountBreakdown.map(item => [item.accountId, item]));

      // Build reports for ALL accounts, including those with no transactions
      const reports: AccountReport[] = decryptedAccounts.map((account) => {
        const breakdown = breakdownMap.get(account.id);
        return {
          accountId: account.id,
          accountName: account.name,
          accountType: account.type,
          expenses: breakdown?.expenses || 0,
          income: breakdown?.income || 0,
          netAmount: (breakdown?.income || 0) - (breakdown?.expenses || 0),
          transactionCount: breakdown?.count || 0,
        };
      });

      // Sort by absolute net amount (accounts with activity first, then by net amount)
      const result = reports.sort((a, b) => {
        // Accounts with transactions come first
        if (a.transactionCount > 0 && b.transactionCount === 0) return -1;
        if (a.transactionCount === 0 && b.transactionCount > 0) return 1;
        // Then sort by absolute net amount
        return Math.abs(b.netAmount) - Math.abs(a.netAmount);
      });
      
      const endTime = Date.now();
      console.log(`[Performance] AccountReport query completed in ${endTime - startTime}ms`);
      
      return result;
    },
    enabled: !!filterStartDate && !!filterEndDate,
  });
}

// Period Comparison Hook

export function usePeriodComparison(startDate: string, endDate: string, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters.reports);
  const incomeEnabled = useSettingsStore((state) => state.incomeCalculationEnabled);
  
  const filterStartDate = useFilters && filters.startDate ? filters.startDate : startDate;
  const filterEndDate = useFilters && filters.endDate ? filters.endDate : endDate;

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.periodComparison(filterStartDate, filterEndDate), 'filters', filters, incomePreferenceKey(incomeEnabled)]
      : [...QUERY_KEYS.periodComparison(filterStartDate, filterEndDate), incomePreferenceKey(incomeEnabled)],
    queryFn: async (): Promise<PeriodComparison> => {
      const start = new Date(filterStartDate);
      const end = new Date(filterEndDate);
      const daysDiff = differenceInDays(end, start);
      
      // Calculate previous period dates
      const prevStart = subDays(start, daysDiff + 1);
      const prevEnd = subDays(start, 1);
      
      const prevStartStr = format(prevStart, 'yyyy-MM-dd');
      const prevEndStr = format(prevEnd, 'yyyy-MM-dd');

      const filterOptions = useFilters ? {
        startDate: filterStartDate,
        endDate: filterEndDate,
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
      } : { startDate: filterStartDate, endDate: filterEndDate };

      const prevFilterOptions = useFilters ? {
        startDate: prevStartStr,
        endDate: prevEndStr,
        accountId: filters.accountId || undefined,
        tagId: filters.tagId || undefined,
        categoryId: filters.categoryId || undefined,
        type: filters.transactionType || undefined,
      } : { startDate: prevStartStr, endDate: prevEndStr };

      // Get current period data
      const currentTransactions = await transactionRepository.findAllWithFilters(filterOptions);
      const currentDecrypted = await transactionRepository.decryptTransactions(currentTransactions);
      const currentVisible = filterTransactionsByIncomePreference(currentDecrypted, incomeEnabled);

      // Get previous period data
      const prevTransactions = await transactionRepository.findAllWithFilters(prevFilterOptions);
      const prevDecrypted = await transactionRepository.decryptTransactions(prevTransactions);
      const prevVisible = filterTransactionsByIncomePreference(prevDecrypted, incomeEnabled);

      // Calculate current period summary
      let currentExpenses = 0, currentIncome = 0, currentExpenseCount = 0, currentIncomeCount = 0;
      for (const t of currentVisible) {
        const amount = typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount)) || 0;
        if (t.type === 'expense') {
          currentExpenses += amount;
          currentExpenseCount++;
        } else {
          currentIncome += amount;
          currentIncomeCount++;
        }
      }

      // Calculate previous period summary
      let prevExpenses = 0, prevIncome = 0, prevExpenseCount = 0, prevIncomeCount = 0;
      for (const t of prevVisible) {
        const amount = typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount)) || 0;
        if (t.type === 'expense') {
          prevExpenses += amount;
          prevExpenseCount++;
        } else {
          prevIncome += amount;
          prevIncomeCount++;
        }
      }

      const current: ReportSummary = {
        totalExpenses: currentExpenses,
        totalIncome: currentIncome,
        netAmount: currentIncome - currentExpenses,
        transactionCount: currentVisible.length,
        averageExpense: currentExpenseCount > 0 ? currentExpenses / currentExpenseCount : 0,
        averageIncome: currentIncomeCount > 0 ? currentIncome / currentIncomeCount : 0,
      };

      const previous: ReportSummary = {
        totalExpenses: prevExpenses,
        totalIncome: prevIncome,
        netAmount: prevIncome - prevExpenses,
        transactionCount: prevVisible.length,
        averageExpense: prevExpenseCount > 0 ? prevExpenses / prevExpenseCount : 0,
        averageIncome: prevIncomeCount > 0 ? prevIncome / prevIncomeCount : 0,
      };

      // Calculate changes
      const incomeChange = current.totalIncome - previous.totalIncome;
      const incomeChangePercent = previous.totalIncome > 0 
        ? (incomeChange / previous.totalIncome) * 100 
        : (current.totalIncome > 0 ? 100 : 0);
      
      const expenseChange = current.totalExpenses - previous.totalExpenses;
      const expenseChangePercent = previous.totalExpenses > 0 
        ? (expenseChange / previous.totalExpenses) * 100 
        : (current.totalExpenses > 0 ? 100 : 0);
      
      const netChange = current.netAmount - previous.netAmount;
      const netChangePercent = previous.netAmount !== 0 
        ? (netChange / Math.abs(previous.netAmount)) * 100 
        : (current.netAmount !== 0 ? (current.netAmount > 0 ? 100 : -100) : 0);

      const transactionCountChange = current.transactionCount - previous.transactionCount;
      const transactionCountChangePercent = previous.transactionCount > 0 
        ? (transactionCountChange / previous.transactionCount) * 100 
        : (current.transactionCount > 0 ? 100 : 0);

      return {
        current,
        previous,
        changes: {
          incomeChange,
          incomeChangePercent,
          expenseChange,
          expenseChangePercent,
          netChange,
          netChangePercent,
          transactionCountChange,
          transactionCountChangePercent,
        },
      };
    },
    enabled: !!filterStartDate && !!filterEndDate,
  });
}

// Daily Spending Patterns Hook

export function useDailyPatterns(startDate: string, endDate: string, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters.reports);
  const incomeEnabled = useSettingsStore((state) => state.incomeCalculationEnabled);
  
  const filterStartDate = useFilters && filters.startDate ? filters.startDate : startDate;
  const filterEndDate = useFilters && filters.endDate ? filters.endDate : endDate;

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.dailyPatterns(filterStartDate, filterEndDate), 'filters', filters, incomePreferenceKey(incomeEnabled)]
      : [...QUERY_KEYS.dailyPatterns(filterStartDate, filterEndDate), incomePreferenceKey(incomeEnabled)],
    queryFn: async (): Promise<DailyPattern[]> => {
      const startTime = Date.now();
      console.log('[Performance] DailyPatterns query started');
      
      const baseFilterOptions = useFilters ? {
        startDate: filterStartDate,
        endDate: filterEndDate,
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
      } : { startDate: filterStartDate, endDate: filterEndDate };
      
      // Daily patterns only show expenses, so filter to expenses
      const filterOptions = {
        ...baseFilterOptions,
        types: baseFilterOptions.types || ['expense'] as Transaction['type'][],
      };
      
      // Use optimized method that only fetches and decrypts amounts with date
      const dayData = await transactionRepository.calculateDailyPatterns(filterOptions);

      // Convert to DailyPattern format
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayMap = new Map(dayData.map((d) => [d.dayIndex, d]));

      const patterns: DailyPattern[] = [];
      for (let i = 0; i < 7; i++) {
        const data = dayMap.get(i) || { totalAmount: 0, count: 0 };
        patterns.push({
          dayOfWeek: dayNames[i],
          dayIndex: i,
          totalAmount: data.totalAmount,
          transactionCount: data.count,
          averageAmount: data.count > 0 ? data.totalAmount / data.count : 0,
        });
      }

      const endTime = Date.now();
      console.log(`[Performance] DailyPatterns query completed in ${endTime - startTime}ms`);
      
      return patterns;
    },
    enabled: !!filterStartDate && !!filterEndDate,
  });
}

// Monthly Trends Hook

export function useMonthlyTrends(startDate: string, endDate: string, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters.reports);
  const incomeEnabled = useSettingsStore((state) => state.incomeCalculationEnabled);

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.monthlyTrends(startDate, endDate), 'filters', filters, incomePreferenceKey(incomeEnabled)]
      : [...QUERY_KEYS.monthlyTrends(startDate, endDate), incomePreferenceKey(incomeEnabled)],
    queryFn: async (): Promise<MonthlyTrend[]> => {
      const startTime = Date.now();
      console.log('[Performance] MonthlyTrends query started');
      
      // Always show last 10 months ending with current month
      const currentDate = new Date();
      const currentMonthEnd = endOfMonth(currentDate);
      const tenMonthsAgo = subMonths(currentMonthEnd, 9); // 9 months back = 10 months total (including current)
      const tenMonthsAgoStart = startOfMonth(tenMonthsAgo);
      
      const trendStartDate = format(tenMonthsAgoStart, 'yyyy-MM-dd');
      const trendEndDate = format(currentMonthEnd, 'yyyy-MM-dd');

      const filterOptions = useFilters ? {
        startDate: trendStartDate,
        endDate: trendEndDate,
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
      } : { 
        startDate: trendStartDate, 
        endDate: trendEndDate 
      };
      
      // Use optimized method that only fetches and decrypts amounts with date and type
      const monthlyData = await transactionRepository.calculateMonthlyTrends(filterOptions);

      // Create a map from the optimized results
      const monthMap = new Map<string, { expenses: number; income: number; count: number }>();
      for (const item of monthlyData) {
        monthMap.set(item.monthKey, {
          expenses: item.expenses,
          income: item.income,
          count: item.count,
        });
      }

      // Generate all 10 months from 9 months ago to current month
      const monthsInterval = eachMonthOfInterval({ 
        start: tenMonthsAgoStart, 
        end: currentMonthEnd 
      });

      const trends: MonthlyTrend[] = monthsInterval.map((date) => {
        const key = format(date, 'yyyy-MM');
        const data = monthMap.get(key) || { expenses: 0, income: 0, count: 0 };
        return {
          month: format(date, 'MMM yyyy'),
          monthIndex: parseInt(format(date, 'M'), 10) - 1,
          totalExpenses: data.expenses,
          totalIncome: data.income,
          netAmount: data.income - data.expenses,
          transactionCount: data.count,
        };
      });

      const endTime = Date.now();
      console.log(`[Performance] MonthlyTrends query completed in ${endTime - startTime}ms`);
      
      return trends;
    },
    enabled: !!startDate && !!endDate,
  });
}


