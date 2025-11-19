import { accountRepository } from '@/repositories/account.repository';
import { categoryRepository } from '@/repositories/category.repository';
import { tagRepository } from '@/repositories/tag.repository';
import { transactionTagRepository } from '@/repositories/transaction-tag.repository';
import { transactionRepository } from '@/repositories/transaction.repository';
import { useUIStore } from '@/store/ui-store';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, eachMonthOfInterval, endOfMonth, format, startOfMonth, subDays, subMonths } from 'date-fns';

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
  
  // Use filter dates if available, otherwise use provided dates
  const filterStartDate = useFilters && filters.startDate ? filters.startDate : startDate;
  const filterEndDate = useFilters && filters.endDate ? filters.endDate : endDate;

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.summary(filterStartDate, filterEndDate), 'filters', filters]
      : QUERY_KEYS.summary(filterStartDate, filterEndDate),
    queryFn: async (): Promise<ReportSummary> => {
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
      
      const transactions = await transactionRepository.findAllWithFilters(filterOptions);
      const decrypted = await transactionRepository.decryptTransactions(transactions);

      let totalExpenses = 0;
      let totalIncome = 0;
      let expenseCount = 0;
      let incomeCount = 0;

      for (const transaction of decrypted) {
        const amount = typeof transaction.amount === 'number' ? transaction.amount : parseFloat(String(transaction.amount)) || 0;
        if (transaction.type === 'expense') {
          totalExpenses += amount;
          expenseCount += 1;
        } else {
          totalIncome += amount;
          incomeCount += 1;
        }
      }

      return {
        totalExpenses,
        totalIncome,
        netAmount: totalIncome - totalExpenses,
        transactionCount: decrypted.length,
        averageExpense: expenseCount > 0 ? totalExpenses / expenseCount : 0,
        averageIncome: incomeCount > 0 ? totalIncome / incomeCount : 0,
      };
    },
    enabled: !!filterStartDate && !!filterEndDate,
  });
}

export function useCategoryReport(startDate: string, endDate: string, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters.reports);
  
  // Use filter dates if available, otherwise use provided dates
  const filterStartDate = useFilters && filters.startDate ? filters.startDate : startDate;
  const filterEndDate = useFilters && filters.endDate ? filters.endDate : endDate;

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.byCategory(filterStartDate, filterEndDate), 'filters', filters]
      : QUERY_KEYS.byCategory(filterStartDate, filterEndDate),
    queryFn: async (): Promise<CategoryReport[]> => {
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
      
      const transactions = await transactionRepository.findAllWithFilters(filterOptions);
      const decrypted = await transactionRepository.decryptTransactions(transactions);

      // Get all transaction categories
      const categoryMap = new Map<number, { name: string; amount: number; count: number }>();
      let totalExpenses = 0;

      for (const transaction of decrypted) {
        if (transaction.type === 'expense') {
          const amount = typeof transaction.amount === 'number' ? transaction.amount : parseFloat(String(transaction.amount)) || 0;
          totalExpenses += amount;
          
          if (!transaction.category_id) {
            // Uncategorized
            const uncategorized = categoryMap.get(0) || { name: 'Uncategorized', amount: 0, count: 0 };
            uncategorized.amount += amount;
            uncategorized.count += 1;
            categoryMap.set(0, uncategorized);
          } else {
            const existing = categoryMap.get(transaction.category_id) || { 
              name: `Category ${transaction.category_id}`, 
              amount: 0, 
              count: 0 
            };
            existing.amount += amount;
            existing.count += 1;
            categoryMap.set(transaction.category_id, existing);
          }
        }
      }

      // Fetch category names
      const reports: CategoryReport[] = [];

      for (const [categoryId, data] of categoryMap.entries()) {
        if (categoryId === 0) {
          reports.push({
            categoryId: 0,
            categoryName: data.name,
            amount: data.amount,
            count: data.count,
            percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
            isDeleted: false,
          });
        } else {
          const category = await categoryRepository.findById(categoryId);
          const decryptedCategory = category ? await categoryRepository.decryptCategory(category) : null;
          reports.push({
            categoryId,
            categoryName: decryptedCategory?.name || data.name,
            amount: data.amount,
            count: data.count,
            percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
            isDeleted: category?.deleted_at !== null,
          });
        }
      }

      return reports.sort((a, b) => b.amount - a.amount);
    },
    enabled: !!filterStartDate && !!filterEndDate,
  });
}

export function useTagReport(startDate: string, endDate: string, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters.reports);
  
  // Use filter dates if available, otherwise use provided dates
  const filterStartDate = useFilters && filters.startDate ? filters.startDate : startDate;
  const filterEndDate = useFilters && filters.endDate ? filters.endDate : endDate;

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.byTag(filterStartDate, filterEndDate), 'filters', filters]
      : QUERY_KEYS.byTag(filterStartDate, filterEndDate),
    queryFn: async (): Promise<TagReport[]> => {
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
      
      const transactions = await transactionRepository.findAllWithFilters(filterOptions);
      const decrypted = await transactionRepository.decryptTransactions(transactions);

      const tagMap = new Map<number, { name: string; amount: number; count: number }>();
      let totalTaggedExpenses = 0; // Total of all tag amounts (may be > totalExpenses due to multi-tag transactions)

      for (const transaction of decrypted) {
        if (transaction.type === 'expense') {
          const amount = typeof transaction.amount === 'number' ? transaction.amount : parseFloat(String(transaction.amount)) || 0;
          const tags = await transactionTagRepository.findByTransactionId(transaction.id);
          
          if (tags.length === 0) {
            const untagged = tagMap.get(0) || { name: 'Untagged', amount: 0, count: 0 };
            untagged.amount += amount;
            untagged.count += 1;
            totalTaggedExpenses += amount;
            tagMap.set(0, untagged);
          } else {
            // For transactions with multiple tags, add full amount to each tag
            for (const tag of tags) {
              const existing = tagMap.get(tag.tag_id) || { 
                name: `Tag ${tag.tag_id}`, 
                amount: 0, 
                count: 0 
              };
              existing.amount += amount;
              existing.count += 1;
              totalTaggedExpenses += amount; // Add amount for each tag
              tagMap.set(tag.tag_id, existing);
            }
          }
        }
      }

      // Fetch tag names
      const reports: TagReport[] = [];

      for (const [tagId, data] of tagMap.entries()) {
        if (tagId === 0) {
          reports.push({
            tagId: 0,
            tagName: data.name,
            amount: data.amount,
            count: data.count,
            percentage: totalTaggedExpenses > 0 ? (data.amount / totalTaggedExpenses) * 100 : 0,
            isDeleted: false,
          });
        } else {
          // Fetch tag including deleted ones for reports
          const tag = await tagRepository.findByIdIncludingDeleted(tagId);
          const decryptedTag = tag ? await tagRepository.decryptTag(tag) : null;
          reports.push({
            tagId,
            tagName: decryptedTag?.name || data.name,
            amount: data.amount,
            count: data.count,
            percentage: totalTaggedExpenses > 0 ? (data.amount / totalTaggedExpenses) * 100 : 0,
            isDeleted: tag?.deleted_at !== null,
          });
        }
      }

      return reports.sort((a, b) => b.amount - a.amount);
    },
    enabled: !!filterStartDate && !!filterEndDate,
  });
}

export function useAccountReport(startDate: string, endDate: string, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters.reports);
  
  // Use filter dates if available, otherwise use provided dates
  const filterStartDate = useFilters && filters.startDate ? filters.startDate : startDate;
  const filterEndDate = useFilters && filters.endDate ? filters.endDate : endDate;

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.byAccount(filterStartDate, filterEndDate), 'filters', filters]
      : QUERY_KEYS.byAccount(filterStartDate, filterEndDate),
    queryFn: async (): Promise<AccountReport[]> => {
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
      
      const transactions = await transactionRepository.findAllWithFilters(filterOptions);
      const decrypted = await transactionRepository.decryptTransactions(transactions);
      const accounts = await accountRepository.findAll();
      const decryptedAccounts = await accountRepository.decryptAccounts(accounts);

      const accountMap = new Map<number, AccountReport>();

      // Initialize account map
      for (const account of decryptedAccounts) {
        accountMap.set(account.id, {
          accountId: account.id,
          accountName: account.name,
          accountType: account.type,
          expenses: 0,
          income: 0,
          netAmount: 0,
          transactionCount: 0,
        });
      }

      // Aggregate transactions by account
      for (const transaction of decrypted) {
        const amount = typeof transaction.amount === 'number' ? transaction.amount : parseFloat(String(transaction.amount)) || 0;
        const report = accountMap.get(transaction.account_id);
        if (report) {
          if (transaction.type === 'expense') {
            report.expenses += amount;
          } else {
            report.income += amount;
          }
          report.transactionCount += 1;
          report.netAmount = report.income - report.expenses;
        }
      }

      return Array.from(accountMap.values())
        .filter((report) => report.transactionCount > 0)
        .sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount));
    },
    enabled: !!filterStartDate && !!filterEndDate,
  });
}

// Period Comparison Hook

export function usePeriodComparison(startDate: string, endDate: string, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters.reports);
  
  const filterStartDate = useFilters && filters.startDate ? filters.startDate : startDate;
  const filterEndDate = useFilters && filters.endDate ? filters.endDate : endDate;

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.periodComparison(filterStartDate, filterEndDate), 'filters', filters]
      : QUERY_KEYS.periodComparison(filterStartDate, filterEndDate),
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

      // Get previous period data
      const prevTransactions = await transactionRepository.findAllWithFilters(prevFilterOptions);
      const prevDecrypted = await transactionRepository.decryptTransactions(prevTransactions);

      // Calculate current period summary
      let currentExpenses = 0, currentIncome = 0, currentExpenseCount = 0, currentIncomeCount = 0;
      for (const t of currentDecrypted) {
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
      for (const t of prevDecrypted) {
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
        transactionCount: currentDecrypted.length,
        averageExpense: currentExpenseCount > 0 ? currentExpenses / currentExpenseCount : 0,
        averageIncome: currentIncomeCount > 0 ? currentIncome / currentIncomeCount : 0,
      };

      const previous: ReportSummary = {
        totalExpenses: prevExpenses,
        totalIncome: prevIncome,
        netAmount: prevIncome - prevExpenses,
        transactionCount: prevDecrypted.length,
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
  
  const filterStartDate = useFilters && filters.startDate ? filters.startDate : startDate;
  const filterEndDate = useFilters && filters.endDate ? filters.endDate : endDate;

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.dailyPatterns(filterStartDate, filterEndDate), 'filters', filters]
      : QUERY_KEYS.dailyPatterns(filterStartDate, filterEndDate),
    queryFn: async (): Promise<DailyPattern[]> => {
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
      
      const transactions = await transactionRepository.findAllWithFilters(filterOptions);
      const decrypted = await transactionRepository.decryptTransactions(transactions);

      const dayMap = new Map<number, { total: number; count: number }>();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      for (const transaction of decrypted) {
        if (transaction.type === 'expense') {
          const date = new Date(transaction.date);
          const dayIndex = date.getDay();
          const amount = typeof transaction.amount === 'number' ? transaction.amount : parseFloat(String(transaction.amount)) || 0;
          
          const existing = dayMap.get(dayIndex) || { total: 0, count: 0 };
          existing.total += amount;
          existing.count += 1;
          dayMap.set(dayIndex, existing);
        }
      }

      const patterns: DailyPattern[] = [];
      for (let i = 0; i < 7; i++) {
        const data = dayMap.get(i) || { total: 0, count: 0 };
        patterns.push({
          dayOfWeek: dayNames[i],
          dayIndex: i,
          totalAmount: data.total,
          transactionCount: data.count,
          averageAmount: data.count > 0 ? data.total / data.count : 0,
        });
      }

      return patterns;
    },
    enabled: !!filterStartDate && !!filterEndDate,
  });
}

// Monthly Trends Hook

export function useMonthlyTrends(startDate: string, endDate: string, useFilters: boolean = false) {
  const filters = useUIStore((state) => state.filters.reports);

  return useQuery({
    queryKey: useFilters 
      ? [...QUERY_KEYS.monthlyTrends(startDate, endDate), 'filters', filters]
      : QUERY_KEYS.monthlyTrends(startDate, endDate),
    queryFn: async (): Promise<MonthlyTrend[]> => {
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
        accountId: filters.accountId || undefined,
        tagId: filters.tagId || undefined,
        categoryId: filters.categoryId || undefined,
        type: filters.transactionType || undefined,
      } : { 
        startDate: trendStartDate, 
        endDate: trendEndDate 
      };
      
      const transactions = await transactionRepository.findAllWithFilters(filterOptions);
      const decrypted = await transactionRepository.decryptTransactions(transactions);

      const monthMap = new Map<string, { expenses: number; income: number; count: number }>();

      for (const transaction of decrypted) {
        const date = new Date(transaction.date);
        const monthKey = format(date, 'yyyy-MM');
        const amount = typeof transaction.amount === 'number' ? transaction.amount : parseFloat(String(transaction.amount)) || 0;
        
        const existing = monthMap.get(monthKey) || { expenses: 0, income: 0, count: 0 };
        if (transaction.type === 'expense') {
          existing.expenses += amount;
        } else {
          existing.income += amount;
        }
        existing.count += 1;
        monthMap.set(monthKey, existing);
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

      return trends;
    },
    enabled: !!startDate && !!endDate,
  });
}


