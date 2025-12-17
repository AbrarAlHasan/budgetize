import { CreateTransactionInput, Transaction, UpdateTransactionInput } from '@/db/schema/types';
import { transactionRepository } from '@/repositories/transaction.repository';
import { syncWidgetData } from '@/services/widget-sync';
import { useSettingsStore } from '@/store/settings-store';
import { filterTransactionsByIncomePreference, incomePreferenceKey } from '@/utils/income-preference';
import { logError, logPerformance } from '@/utils/logger';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const QUERY_KEYS = {
  all: ['transactions'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  list: (filters?: {
    accountId?: number;
    accountIds?: number[];
    tagId?: number;
    tagIds?: number[];
    categoryId?: number;
    categoryIds?: number[];
    startDate?: string;
    endDate?: string;
    type?: Transaction['type'];
    types?: Transaction['type'][];
    accountType?: string;
    accountTypes?: string[];
  }) => [...QUERY_KEYS.lists(), filters] as const,
  details: () => [...QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...QUERY_KEYS.details(), id] as const,
  byAccount: (accountId: number) => [...QUERY_KEYS.all, 'account', accountId] as const,
  byDateRange: (startDate: string, endDate: string) => 
    [...QUERY_KEYS.all, 'dateRange', startDate, endDate] as const,
};

export function useTransactions(filters?: {
  accountId?: number;
  accountIds?: number[];
  tagId?: number;
  tagIds?: number[];
  categoryId?: number;
  categoryIds?: number[];
  startDate?: string;
  endDate?: string;
  type?: Transaction['type'];
  types?: Transaction['type'][];
  accountType?: string;
  accountTypes?: string[];
}) {
  const incomeEnabled = useSettingsStore((state) => state.settings.incomeCalculationEnabled);

  return useQuery({
    queryKey: [...QUERY_KEYS.list(filters), incomePreferenceKey(incomeEnabled)],
    queryFn: async () => {
      const startTime = Date.now();
      
      const transactions = await transactionRepository.findAllWithFilters(filters);
      const decrypted = await transactionRepository.decryptTransactions(transactions);
      const result = filterTransactionsByIncomePreference(decrypted, incomeEnabled);
      
      const endTime = Date.now();
      logPerformance('useTransactions_query', endTime - startTime, `${result.length} transactions`);
      
      return result;
    },
  });
}

const TRANSACTIONS_PER_PAGE = 20;

export function useTransactionsPaginated(filters?: {
  accountId?: number;
  accountIds?: number[];
  tagId?: number;
  tagIds?: number[];
  categoryId?: number;
  categoryIds?: number[];
  startDate?: string;
  endDate?: string;
  type?: Transaction['type'];
  types?: Transaction['type'][];
  accountType?: string;
  accountTypes?: string[];
}) {
  const incomeEnabled = useSettingsStore((state) => state.settings.incomeCalculationEnabled);

  return useInfiniteQuery({
    queryKey: [...QUERY_KEYS.list(filters), 'paginated', incomePreferenceKey(incomeEnabled)],
    queryFn: async ({ pageParam = 0 }) => {
      const startTime = Date.now();
      
      const result = await transactionRepository.findAllWithFiltersPaginated(
        filters,
        TRANSACTIONS_PER_PAGE,
        pageParam * TRANSACTIONS_PER_PAGE
      );
      const decrypted = await transactionRepository.decryptTransactions(result.transactions);
      const filtered = filterTransactionsByIncomePreference(decrypted, incomeEnabled);
      
      const queryResult = {
        transactions: filtered,
        hasMore: result.hasMore,
        nextPage: result.hasMore ? pageParam + 1 : undefined,
      };
      
      const endTime = Date.now();
      logPerformance('useTransactionsPaginated_query', endTime - startTime, `page: ${pageParam}, ${filtered.length} transactions, hasMore: ${result.hasMore}`);
      
      return queryResult;
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
}

export function useTransaction(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: async () => {
      const transaction = await transactionRepository.findById(id);
      if (!transaction) return null;
      return transactionRepository.decryptTransaction(transaction);
    },
    enabled: !!id,
  });
}

export function useTransactionsByAccount(accountId: number) {
  const incomeEnabled = useSettingsStore((state) => state.settings.incomeCalculationEnabled);

  return useQuery({
    queryKey: [...QUERY_KEYS.byAccount(accountId), incomePreferenceKey(incomeEnabled)],
    queryFn: async () => {
      const transactions = await transactionRepository.findByAccountId(accountId);
      const decrypted = await transactionRepository.decryptTransactions(transactions);
      return filterTransactionsByIncomePreference(decrypted, incomeEnabled);
    },
    enabled: !!accountId,
  });
}

export function useTransactionsByDateRange(startDate: string, endDate: string) {
  const incomeEnabled = useSettingsStore((state) => state.settings.incomeCalculationEnabled);

  return useQuery({
    queryKey: [...QUERY_KEYS.byDateRange(startDate, endDate), incomePreferenceKey(incomeEnabled)],
    queryFn: async () => {
      const transactions = await transactionRepository.findByDateRange(startDate, endDate);
      const decrypted = await transactionRepository.decryptTransactions(transactions);
      return filterTransactionsByIncomePreference(decrypted, incomeEnabled);
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTransactionInput) => transactionRepository.create(input),
    onSuccess: async (data) => {
      // Invalidate all transaction-related queries
      await Promise.all([
        // All transaction queries
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.id) }),
        // Dashboard queries
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-latest-transactions'] }),
        // Reports queries
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
        queryClient.invalidateQueries({ queryKey: ['spendingVelocity'] }),
        queryClient.invalidateQueries({ queryKey: ['accountSpendingVelocity'] }),
        // Account queries
        queryClient.invalidateQueries({ queryKey: ['account-balances'] }),
        queryClient.invalidateQueries({ queryKey: ['accountMonthlyData'] }),
        queryClient.invalidateQueries({ queryKey: ['account-latest-transactions'] }),
      ]);

      // Sync widget data (non-blocking, errors are logged but don't fail the mutation)
      syncWidgetData().catch((error) => {
        logError('Failed to sync widget data after creating transaction:', error);
      });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTransactionInput) => transactionRepository.update(input),
    onSuccess: async (data) => {
      // Invalidate all transaction-related queries
      await Promise.all([
        // All transaction queries
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.id) }),
        // Dashboard queries
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-latest-transactions'] }),
        // Reports queries
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
        queryClient.invalidateQueries({ queryKey: ['spendingVelocity'] }),
        queryClient.invalidateQueries({ queryKey: ['accountSpendingVelocity'] }),
        // Account queries
        queryClient.invalidateQueries({ queryKey: ['account-balances'] }),
        queryClient.invalidateQueries({ queryKey: ['accountMonthlyData'] }),
        queryClient.invalidateQueries({ queryKey: ['account-latest-transactions'] }),
      ]);

      // Sync widget data (non-blocking, errors are logged but don't fail the mutation)
      syncWidgetData().catch((error) => {
        logError('Failed to sync widget data after updating transaction:', error);
      });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => transactionRepository.delete(id),
    onSuccess: async () => {
      // Invalidate all transaction-related queries
      await Promise.all([
        // All transaction queries
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all }),
        // Dashboard queries
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-latest-transactions'] }),
        // Reports queries
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
        queryClient.invalidateQueries({ queryKey: ['spendingVelocity'] }),
        queryClient.invalidateQueries({ queryKey: ['accountSpendingVelocity'] }),
        // Account queries
        queryClient.invalidateQueries({ queryKey: ['account-balances'] }),
        queryClient.invalidateQueries({ queryKey: ['accountMonthlyData'] }),
        queryClient.invalidateQueries({ queryKey: ['account-latest-transactions'] }),
      ]);

      // Sync widget data (non-blocking, errors are logged but don't fail the mutation)
      syncWidgetData().catch((error) => {
        logError('Failed to sync widget data after deleting transaction:', error);
      });
    },
  });
}

