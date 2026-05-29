import { CreateTransactionInput, Transaction, UpdateTransactionInput } from '@/db/schema/types';
import { transactionRepository } from '@/repositories/transaction.repository';
import { syncWidgetData } from '@/services/widget-sync';
import { useSettingsStore } from '@/store/settings-store';
import { filterTransactionsByIncomePreference, incomePreferenceKey } from '@/utils/income-preference';
import { logError, logPerformance } from '@/utils/logger';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export type TransactionFilters = {
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
};

export interface TransactionSummaryTotals {
  totalExpenses: number;
  totalIncome: number;
  netAmount: number;
  transactionCount: number;
}

function applyIncomeFilterToQueryFilters(
  filters: TransactionFilters | undefined,
  incomeEnabled: boolean
): TransactionFilters | undefined {
  if (!filters) {
    return filters;
  }
  if (!incomeEnabled && !filters.types) {
    return { ...filters, types: ['expense'] };
  }
  return filters;
}

const QUERY_KEYS = {
  all: ['transactions'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  list: (filters?: TransactionFilters) => [...QUERY_KEYS.lists(), filters] as const,
  details: () => [...QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...QUERY_KEYS.details(), id] as const,
  byAccount: (accountId: number) => [...QUERY_KEYS.all, 'account', accountId] as const,
  byDateRange: (startDate: string, endDate: string) => 
    [...QUERY_KEYS.all, 'dateRange', startDate, endDate] as const,
};

export function useTransactions(filters?: TransactionFilters) {
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

function getSearchIdsQueryKey(
  filters: TransactionFilters | undefined,
  searchQuery: string,
  incomeEnabled: boolean
) {
  return [
    ...QUERY_KEYS.list(filters),
    'search-ids',
    searchQuery,
    incomePreferenceKey(incomeEnabled),
  ] as const;
}

export function useTransactionSummaryTotals(
  filters?: TransactionFilters,
  searchQuery?: string
): ReturnType<typeof useQuery<TransactionSummaryTotals>> {
  const queryClient = useQueryClient();
  const incomeEnabled = useSettingsStore(
    (state) => state.settings.incomeCalculationEnabled
  );
  const trimmedSearch = searchQuery?.trim() ?? '';

  return useQuery({
    queryKey: [
      ...QUERY_KEYS.list(filters),
      'summary',
      incomePreferenceKey(incomeEnabled),
      trimmedSearch,
    ],
    queryFn: async (): Promise<TransactionSummaryTotals> => {
      const startTime = Date.now();
      const filterOptions = applyIncomeFilterToQueryFilters(filters, incomeEnabled);

      if (trimmedSearch) {
        const searchMatches = await queryClient.ensureQueryData({
          queryKey: getSearchIdsQueryKey(filters, trimmedSearch, incomeEnabled),
          queryFn: () =>
            transactionRepository.findNoteOrPaymentModeSearchMatches(
              filterOptions,
              trimmedSearch
            ),
        });

        const totalIncome = incomeEnabled ? searchMatches.totalIncome : 0;

        return {
          totalExpenses: searchMatches.totalExpenses,
          totalIncome,
          netAmount: totalIncome - searchMatches.totalExpenses,
          transactionCount: searchMatches.transactionCount,
        };
      }

      const totals = await transactionRepository.calculateSummaryTotals(
        filterOptions
      );
      const finalTotals = !incomeEnabled
        ? { ...totals, totalIncome: 0, incomeCount: 0 }
        : totals;

      const result: TransactionSummaryTotals = {
        totalExpenses: finalTotals.totalExpenses,
        totalIncome: finalTotals.totalIncome,
        netAmount: finalTotals.totalIncome - finalTotals.totalExpenses,
        transactionCount: finalTotals.transactionCount,
      };

      logPerformance(
        'useTransactionSummaryTotals_query',
        Date.now() - startTime,
        `${result.transactionCount} transactions`
      );

      return result;
    },
    enabled: Boolean(filters?.startDate && filters?.endDate),
    placeholderData: keepPreviousData,
  });
}

export function useTransactionsPaginated(
  filters?: TransactionFilters,
  searchQuery?: string
) {
  const queryClient = useQueryClient();
  const incomeEnabled = useSettingsStore(
    (state) => state.settings.incomeCalculationEnabled
  );
  const trimmedSearch = searchQuery?.trim() ?? '';

  return useInfiniteQuery({
    queryKey: [
      ...QUERY_KEYS.list(filters),
      'paginated',
      incomePreferenceKey(incomeEnabled),
      trimmedSearch,
    ],
    queryFn: async ({ pageParam = 0 }) => {
      const startTime = Date.now();
      const filterOptions = applyIncomeFilterToQueryFilters(filters, incomeEnabled);
      const offset = pageParam * TRANSACTIONS_PER_PAGE;

      if (trimmedSearch) {
        const searchMatches = await queryClient.ensureQueryData({
          queryKey: getSearchIdsQueryKey(filters, trimmedSearch, incomeEnabled),
          queryFn: () =>
            transactionRepository.findNoteOrPaymentModeSearchMatches(
              filterOptions,
              trimmedSearch
            ),
        });

        const pageIds = searchMatches.ids.slice(
          offset,
          offset + TRANSACTIONS_PER_PAGE
        );

        if (pageIds.length === 0) {
          return {
            transactions: [],
            hasMore: false,
            nextPage: undefined,
          };
        }

        const rawTransactions = await transactionRepository.findByIds(pageIds);
        const transactionById = new Map(
          rawTransactions.map((transaction) => [transaction.id, transaction])
        );
        const orderedTransactions = pageIds
          .map((id) => transactionById.get(id))
          .filter((transaction): transaction is Transaction => !!transaction);

        const decrypted =
          await transactionRepository.decryptTransactions(orderedTransactions);
        const filtered = filterTransactionsByIncomePreference(
          decrypted,
          incomeEnabled
        );

        const hasMore = offset + pageIds.length < searchMatches.ids.length;

        logPerformance(
          'useTransactionsPaginated_search_query',
          Date.now() - startTime,
          `page: ${pageParam}, ${filtered.length} transactions, hasMore: ${hasMore}`
        );

        return {
          transactions: filtered,
          hasMore,
          nextPage: hasMore ? pageParam + 1 : undefined,
        };
      }

      const result = await transactionRepository.findAllWithFiltersPaginated(
        filterOptions,
        TRANSACTIONS_PER_PAGE,
        offset
      );
      const decrypted = await transactionRepository.decryptTransactions(
        result.transactions
      );
      const filtered = filterTransactionsByIncomePreference(
        decrypted,
        incomeEnabled
      );

      const queryResult = {
        transactions: filtered,
        hasMore: result.hasMore,
        nextPage: result.hasMore ? pageParam + 1 : undefined,
      };

      logPerformance(
        'useTransactionsPaginated_query',
        Date.now() - startTime,
        `page: ${pageParam}, ${filtered.length} transactions, hasMore: ${result.hasMore}`
      );

      return queryResult;
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    placeholderData: keepPreviousData,
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

