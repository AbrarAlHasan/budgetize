import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { transactionRepository } from '@/repositories/transaction.repository';
import { CreateTransactionInput, UpdateTransactionInput, Transaction } from '@/db/schema/types';
import { useSettingsStore } from '@/store/settings-store';
import { filterTransactionsByIncomePreference, incomePreferenceKey } from '@/utils/income-preference';

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
  const incomeEnabled = useSettingsStore((state) => state.incomeCalculationEnabled);

  return useQuery({
    queryKey: [...QUERY_KEYS.list(filters), incomePreferenceKey(incomeEnabled)],
    queryFn: async () => {
      const transactions = await transactionRepository.findAllWithFilters(filters);
      const decrypted = await transactionRepository.decryptTransactions(transactions);
      return filterTransactionsByIncomePreference(decrypted, incomeEnabled);
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
  const incomeEnabled = useSettingsStore((state) => state.incomeCalculationEnabled);

  return useInfiniteQuery({
    queryKey: [...QUERY_KEYS.list(filters), 'paginated', incomePreferenceKey(incomeEnabled)],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await transactionRepository.findAllWithFiltersPaginated(
        filters,
        TRANSACTIONS_PER_PAGE,
        pageParam * TRANSACTIONS_PER_PAGE
      );
      const decrypted = await transactionRepository.decryptTransactions(result.transactions);
      const filtered = filterTransactionsByIncomePreference(decrypted, incomeEnabled);
      
      return {
        transactions: filtered,
        hasMore: result.hasMore,
        nextPage: result.hasMore ? pageParam + 1 : undefined,
      };
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
  const incomeEnabled = useSettingsStore((state) => state.incomeCalculationEnabled);

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
  const incomeEnabled = useSettingsStore((state) => state.incomeCalculationEnabled);

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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.id) });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTransactionInput) => transactionRepository.update(input),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.id) });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => transactionRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
}

