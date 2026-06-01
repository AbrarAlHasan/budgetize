import React from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  TransactionFilters,
  useTransactionSummaryTotals,
  useTransactionsPaginated,
} from '@/hooks/queries/use-transactions';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useMarkInteractive } from '@/hooks/use-mark-interactive';
import { TransactionSearchBar } from '@/components/expenses/transaction-search-bar';
import { ExpensesInlineTotal } from '@/components/expenses/expenses-inline-total';
import { ExpensesListHeader } from '@/components/expenses/expenses-list-header';
import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import { TransactionItem } from '@/components/transaction-item';
import { TransactionsListSkeleton } from '@/components/skeletons';
import { router } from 'expo-router';
import { useAccounts } from '@/hooks/queries/use-accounts';
import { categoryRepository } from '@/repositories/category.repository';
import { transactionTagRepository } from '@/repositories/transaction-tag.repository';
import { tagRepository } from '@/repositories/tag.repository';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '@/store/ui-store';
import { useSettingsStore } from '@/store/settings-store';
import { getCurrencySymbol } from '@/utils/currencies';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import type { Transaction } from '@/db/schema/types';

type DecryptedTransaction = Omit<
  Transaction,
  'amount' | 'note' | 'payment_mode'
> & {
  amount: number;
  note: string | null;
  payment_mode: string | null;
};

const LIST_BOTTOM_PADDING = 24;

export default function ExpensesScreen() {
  useMarkInteractive();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const filters = useUIStore((state) => state.filters.expenses);
  const setDateRangeFilter = useUIStore((state) => state.setDateRangeFilter);
  const setCurrentFilterContext = useUIStore((state) => state.setCurrentFilterContext);
  const { settings, loadSettings } = useSettingsStore();

  const {
    query: searchInput,
    setQuery: setSearchInput,
    clearQuery: clearSearch,
    debouncedQuery: debouncedSearch,
    isDebouncing,
  } = useDebouncedSearch();

  React.useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!filters.startDate || !filters.endDate) {
      const now = new Date();
      const start = format(startOfMonth(now), 'yyyy-MM-dd');
      const end = format(endOfMonth(now), 'yyyy-MM-dd');
      setDateRangeFilter('expenses', start, end);
    }
  }, [filters.startDate, filters.endDate, setDateRangeFilter]);

  const filterKey = React.useMemo(
    () =>
      JSON.stringify({
        accountIds: filters.accountIds,
        tagIds: filters.tagIds,
        categoryIds: filters.categoryIds,
        startDate: filters.startDate,
        endDate: filters.endDate,
        transactionTypes: filters.transactionTypes,
        accountTypes: filters.accountTypes,
      }),
    [
      filters.accountIds,
      filters.tagIds,
      filters.categoryIds,
      filters.startDate,
      filters.endDate,
      filters.transactionTypes,
      filters.accountTypes,
    ]
  );

  const [transactionTags, setTransactionTags] = React.useState<
    Map<number, Array<{ id: number; name: string }>>
  >(new Map());
  const [transactionCategories, setTransactionCategories] = React.useState<
    Map<number, string>
  >(new Map());
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    setTransactionTags(new Map());
    setTransactionCategories(new Map());
  }, [filterKey, queryClient]);

  const transactionFilters = React.useMemo((): TransactionFilters | undefined => {
    if (!filters.startDate || !filters.endDate) {
      return undefined;
    }

    return {
      accountIds:
        filters.accountIds && filters.accountIds.length > 0
          ? filters.accountIds
          : undefined,
      accountId: filters.accountId || undefined,
      tagIds:
        filters.tagIds && filters.tagIds.length > 0 ? filters.tagIds : undefined,
      tagId: filters.tagId || undefined,
      categoryIds:
        filters.categoryIds && filters.categoryIds.length > 0
          ? filters.categoryIds
          : undefined,
      categoryId: filters.categoryId || undefined,
      startDate: filters.startDate,
      endDate: filters.endDate,
      types:
        filters.transactionTypes && filters.transactionTypes.length > 0
          ? filters.transactionTypes
          : undefined,
      type: filters.transactionType || undefined,
      accountTypes:
        filters.accountTypes && filters.accountTypes.length > 0
          ? filters.accountTypes
          : undefined,
      accountType: filters.accountType || undefined,
    };
  }, [
    filters.accountId,
    filters.accountIds,
    filters.accountType,
    filters.accountTypes,
    filters.categoryId,
    filters.categoryIds,
    filters.endDate,
    filters.startDate,
    filters.tagId,
    filters.tagIds,
    filters.transactionType,
    filters.transactionTypes,
  ]);

  const hasActiveFilters =
    (filters.accountIds && filters.accountIds.length > 0) ||
    (filters.tagIds && filters.tagIds.length > 0) ||
    (filters.categoryIds && filters.categoryIds.length > 0) ||
    filters.startDate !== null ||
    filters.endDate !== null ||
    (filters.transactionTypes && filters.transactionTypes.length > 0) ||
    (filters.accountTypes && filters.accountTypes.length > 0);

  const {
    data,
    isLoading: isListLoading,
    isFetching: isListFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useTransactionsPaginated(transactionFilters, debouncedSearch);

  const {
    data: summaryTotals,
    isLoading: isSummaryLoading,
    isFetching: isSummaryFetching,
    refetch: refetchSummary,
  } = useTransactionSummaryTotals(transactionFilters, debouncedSearch);

  const isInitialListLoading = isListLoading && !data;
  const isListUpdating =
    !isDebouncing && debouncedSearch.length > 0 && isListFetching && !!data;

  const transactions = React.useMemo((): DecryptedTransaction[] => {
    return data?.pages.flatMap((page) => page.transactions) ?? [];
  }, [data]);

  const { data: accounts } = useAccounts();
  const currencySymbol = React.useMemo(
    () => getCurrencySymbol(settings.currency),
    [settings.currency]
  );

  React.useEffect(() => {
    if (transactions.length === 0) {
      return;
    }

    let cancelled = false;

    const loadTagsAndCategories = async (): Promise<void> => {
      const transactionsToLoad = transactions.filter(
        (t) => !transactionTags.has(t.id) && !transactionCategories.has(t.id)
      );

      if (transactionsToLoad.length === 0) {
        return;
      }

      const newTagsMap = new Map<number, Array<{ id: number; name: string }>>();
      const newCategoriesMap = new Map<number, string>();

      const transactionIds = transactionsToLoad.map((t) => t.id);
      const categoryIds = transactionsToLoad
        .map((t) => t.category_id)
        .filter((id): id is number => id !== null && id !== 0);

      const allTransactionTags = await Promise.all(
        transactionIds.map((id) =>
          transactionTagRepository.findByTransactionId(id)
        )
      );

      const tagIdsSet = new Set<number>();
      allTransactionTags.forEach((tags) => {
        tags.forEach((tt) => tagIdsSet.add(tt.tag_id));
      });
      const tagIds = Array.from(tagIdsSet);

      const [allTags, allCategories] = await Promise.all([
        tagIds.length > 0
          ? tagRepository.findByIdsIncludingDeleted(tagIds)
          : Promise.resolve([]),
        categoryIds.length > 0
          ? categoryRepository.findByIdsIncludingDeleted(categoryIds)
          : Promise.resolve([]),
      ]);

      const [decryptedTags, decryptedCategories] = await Promise.all([
        tagRepository.decryptTags(allTags),
        categoryRepository.decryptCategories(allCategories),
      ]);

      const tagMap = new Map(decryptedTags.map((t) => [t.id, t]));
      const categoryMap = new Map(decryptedCategories.map((c) => [c.id, c]));

      transactionsToLoad.forEach((transaction, index) => {
        const transactionTagIds = allTransactionTags[index];
        const tagDetails = transactionTagIds
          .map((tt) => {
            const tag = tagMap.get(tt.tag_id);
            return tag ? { id: tag.id, name: tag.name } : null;
          })
          .filter((t): t is { id: number; name: string } => t !== null);
        newTagsMap.set(transaction.id, tagDetails);

        if (transaction.category_id) {
          const category = categoryMap.get(transaction.category_id);
          if (category) {
            newCategoriesMap.set(transaction.id, category.name);
          }
        }
      });

      if (cancelled) {
        return;
      }

      setTransactionTags((prev) => new Map([...prev, ...newTagsMap]));
      setTransactionCategories((prev) => new Map([...prev, ...newCategoriesMap]));
    };

    loadTagsAndCategories();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  const getAccountName = React.useCallback(
    (accountId: number): string => {
      return accounts?.find((a) => a.id === accountId)?.name ?? '';
    },
    [accounts]
  );

  const handleSearchChange = React.useCallback(
    (text: string) => {
      setSearchInput(text);
    },
    [setSearchInput]
  );

  const handleOpenFilters = React.useCallback(() => {
    setCurrentFilterContext('expenses');
    router.push({ pathname: '/filters', params: { context: 'expenses' } });
  }, [setCurrentFilterContext]);

  const handleAddTransaction = React.useCallback(() => {
    router.push({ pathname: '/expenses/add', params: { from: 'Expenses' } });
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        refetchSummary(),
        queryClient.refetchQueries({ queryKey: ['accounts'] }),
        queryClient.refetchQueries({ queryKey: ['tags'] }),
        queryClient.refetchQueries({ queryKey: ['categories'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, refetch, refetchSummary]);

  const loadMore = React.useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = React.useCallback(
    ({ item: transaction }: { item: DecryptedTransaction }) => (
      <View className="px-5 mb-3">
        <TransactionItem
          id={transaction.id}
          amount={transaction.amount}
          type={transaction.type}
          date={transaction.date}
          note={transaction.note}
          payment_mode={transaction.payment_mode}
          accountName={getAccountName(transaction.account_id)}
          currencySymbol={currencySymbol}
          tags={transactionTags.get(transaction.id)}
          categoryName={transactionCategories.get(transaction.id)}
        />
      </View>
    ),
    [currencySymbol, getAccountName, transactionCategories, transactionTags]
  );

  const keyExtractor = React.useCallback(
    (item: DecryptedTransaction) => item.id.toString(),
    []
  );

  const listEmptyComponent = React.useMemo(() => {
    if (isInitialListLoading || isListUpdating) {
      return (
        <View className="px-5 pt-2">
          <TransactionsListSkeleton count={8} />
        </View>
      );
    }

    if (debouncedSearch.length > 0) {
      return (
        <View className="px-5 pt-2">
          <View className="bg-white dark:bg-gray-900 rounded-2xl p-8 items-center">
            <Ionicons name="search-outline" size={48} color="#9CA3AF" />
            <Text className="text-gray-500 dark:text-gray-400 text-center mt-4">
              No transactions match &quot;{debouncedSearch}&quot;
            </Text>
            <Text className="text-sm text-gray-400 dark:text-gray-500 text-center mt-2">
              Try another keyword in note or payment mode
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View className="px-5 pt-2">
        <View className="bg-white dark:bg-gray-900 rounded-2xl p-8 items-center">
          <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-500 dark:text-gray-400 text-center mt-4 mb-6">
            No transactions yet
          </Text>
          <TouchableOpacity
            onPress={handleAddTransaction}
            className="bg-blue-600 rounded-2xl px-6 py-3"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold">Add Your First Transaction</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [
    debouncedSearch,
    handleAddTransaction,
    isInitialListLoading,
    isListUpdating,
  ]);

  const listFooterComponent = React.useMemo(() => {
    if (!isFetchingNextPage) {
      return null;
    }
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  }, [isFetchingNextPage]);

  const isSummaryFetchingVisible =
    !isDebouncing && isSummaryFetching && !!summaryTotals;

  const incomeEnabled = settings.incomeCalculationEnabled;

  const listHeaderComponent = React.useMemo(() => {
    if (!incomeEnabled) {
      return null;
    }

    return (
      <ExpensesListHeader
        summary={summaryTotals}
        currencySymbol={currencySymbol}
        incomeEnabled
        isLoading={isSummaryLoading && !summaryTotals}
        isFetching={isSummaryFetchingVisible}
      />
    );
  }, [
    currencySymbol,
    incomeEnabled,
    isSummaryFetchingVisible,
    isSummaryLoading,
    summaryTotals,
  ]);

  const expenseCountLabel = React.useMemo(() => {
    if (incomeEnabled || !summaryTotals) {
      return null;
    }

    const count = summaryTotals.transactionCount;
    const suffix = isSummaryFetchingVisible ? ' · Updating…' : ' in this period';
    return `${count} ${count === 1 ? 'transaction' : 'transactions'}${suffix}`;
  }, [incomeEnabled, isSummaryFetchingVisible, summaryTotals]);

  const listBottomPadding = insets.bottom + LIST_BOTTOM_PADDING;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
      <View className="px-5 pt-3 pb-0.5">
        <View className="relative mb-2 h-10 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={handleOpenFilters}
            className="h-10 w-10 items-center justify-center rounded-xl z-10"
            style={{
              backgroundColor: hasActiveFilters ? '#EFF6FF' : '#F3F4F6',
            }}
            accessibilityRole="button"
            accessibilityLabel="Open filters"
          >
            <Ionicons
              name="filter"
              size={20}
              color={hasActiveFilters ? '#3B82F6' : '#6B7280'}
            />
            {hasActiveFilters ? (
              <View className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600" />
            ) : null}
          </TouchableOpacity>

          <Text
            className="absolute inset-x-0 text-center text-xl font-bold text-gray-900 dark:text-gray-100"
            pointerEvents="none"
          >
            Expenses
          </Text>

          <TouchableOpacity
            onPress={handleAddTransaction}
            className="h-10 w-10 items-center justify-center rounded-xl bg-blue-600 z-10"
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Add transaction"
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ActiveFilterChips context="expenses" />

        {incomeEnabled ? (
          <TransactionSearchBar
            value={searchInput}
            onChangeText={handleSearchChange}
            onClear={clearSearch}
            isDebouncing={isDebouncing}
            compact
            variant="filled"
          />
        ) : (
          <>
            <View className="mb-2 flex-row items-stretch gap-2">
              <View className="flex-1">
                <TransactionSearchBar
                  value={searchInput}
                  onChangeText={handleSearchChange}
                  onClear={clearSearch}
                  isDebouncing={isDebouncing}
                  compact
                  embedded
                  variant="filled"
                />
              </View>
              <ExpensesInlineTotal
                summary={summaryTotals}
                currencySymbol={currencySymbol}
                isLoading={isSummaryLoading && !summaryTotals}
                isFetching={isSummaryFetchingVisible}
              />
            </View>
            {expenseCountLabel ? (
              <Text className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">
                {expenseCountLabel}
              </Text>
            ) : null}
          </>
        )}
      </View>

      <FlatList
        className="flex-1"
        data={transactions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeaderComponent}
        ListEmptyComponent={listEmptyComponent}
        ListFooterComponent={listFooterComponent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefetching}
            onRefresh={onRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          transactions.length === 0
            ? { flexGrow: 1, paddingBottom: listBottomPadding }
            : { paddingBottom: listBottomPadding }
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        removeClippedSubviews
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}
