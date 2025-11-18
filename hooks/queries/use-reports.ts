import { useQuery } from '@tanstack/react-query';
import { transactionRepository } from '@/repositories/transaction.repository';
import { transactionTagRepository } from '@/repositories/transaction-tag.repository';
import { accountRepository } from '@/repositories/account.repository';
import { useUIStore } from '@/store/ui-store';

const QUERY_KEYS = {
  all: ['reports'] as const,
  summary: (startDate: string, endDate: string) => 
    [...QUERY_KEYS.all, 'summary', startDate, endDate] as const,
  byCategory: (startDate: string, endDate: string) => 
    [...QUERY_KEYS.all, 'category', startDate, endDate] as const,
  byAccount: (startDate: string, endDate: string) => 
    [...QUERY_KEYS.all, 'account', startDate, endDate] as const,
};

interface ReportSummary {
  totalExpenses: number;
  totalIncome: number;
  netAmount: number;
  transactionCount: number;
  averageExpense: number;
  averageIncome: number;
}

interface CategoryReport {
  tagId: number;
  tagName: string;
  amount: number;
  count: number;
  percentage: number;
  isDeleted?: boolean;
}

interface AccountReport {
  accountId: number;
  accountName: string;
  accountType: string;
  expenses: number;
  income: number;
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
        accountId: filters.accountId || undefined,
        tagId: filters.tagId || undefined,
        categoryId: filters.categoryId || undefined,
        type: filters.transactionType || undefined,
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
        accountId: filters.accountId || undefined,
        tagId: filters.tagId || undefined,
        categoryId: filters.categoryId || undefined,
        type: filters.transactionType || undefined,
      } : { startDate: filterStartDate, endDate: filterEndDate };
      
      const transactions = await transactionRepository.findAllWithFilters(filterOptions);
      const decrypted = await transactionRepository.decryptTransactions(transactions);

      const tagMap = new Map<number, { name: string; amount: number; count: number }>();
      let totalExpenses = 0;

      for (const transaction of decrypted) {
        if (transaction.type === 'expense') {
          const amount = typeof transaction.amount === 'number' ? transaction.amount : parseFloat(String(transaction.amount)) || 0;
          totalExpenses += amount;
          const tags = await transactionTagRepository.findByTransactionId(transaction.id);
          
          if (tags.length === 0) {
            const uncategorized = tagMap.get(0) || { name: 'Uncategorized', amount: 0, count: 0 };
            uncategorized.amount += amount;
            uncategorized.count += 1;
            tagMap.set(0, uncategorized);
          } else {
            for (const tag of tags) {
              const existing = tagMap.get(tag.tag_id) || { 
                name: `Tag ${tag.tag_id}`, 
                amount: 0, 
                count: 0 
              };
              existing.amount += amount;
              existing.count += 1;
              tagMap.set(tag.tag_id, existing);
            }
          }
        }
      }

      const { tagRepository } = await import('@/repositories/tag.repository');
      const reports: CategoryReport[] = [];

      for (const [tagId, data] of tagMap.entries()) {
        if (tagId === 0) {
          reports.push({
            tagId: 0,
            tagName: data.name,
            amount: data.amount,
            count: data.count,
            percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
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
            percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
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
        accountId: filters.accountId || undefined,
        tagId: filters.tagId || undefined,
        categoryId: filters.categoryId || undefined,
        type: filters.transactionType || undefined,
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

