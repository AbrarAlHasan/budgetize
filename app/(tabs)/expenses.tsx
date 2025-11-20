import React from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTransactionsPaginated } from '@/hooks/queries/use-transactions';
import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import { TransactionItem } from '@/components/transaction-item';
import { TransactionsListSkeleton } from '@/components/skeletons';
import { router } from 'expo-router';
import { useAccounts } from '@/hooks/queries/use-accounts';
import { useCategories } from '@/hooks/queries/use-categories';
import { categoryRepository } from '@/repositories/category.repository';
import { transactionTagRepository } from '@/repositories/transaction-tag.repository';
import { tagRepository } from '@/repositories/tag.repository';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '@/store/ui-store';
import { useSettingsStore } from '@/store/settings-store';
import { getCurrencySymbol } from '@/utils/currencies';

export default function ExpensesScreen() {
  const queryClient = useQueryClient();
  const filters = useUIStore((state) => state.filters.expenses);
  const setCurrentFilterContext = useUIStore((state) => state.setCurrentFilterContext);
  const { settings, loadSettings } = useSettingsStore();

  React.useEffect(() => {
    loadSettings();
  }, []);
  
  // Invalidate queries when filters change
  const filterKey = React.useMemo(() => 
    JSON.stringify({
      accountIds: filters.accountIds,
      tagIds: filters.tagIds,
      categoryIds: filters.categoryIds,
      startDate: filters.startDate,
      endDate: filters.endDate,
      transactionTypes: filters.transactionTypes,
      accountTypes: filters.accountTypes,
    }),
    [filters.accountIds, filters.tagIds, filters.categoryIds, filters.startDate, filters.endDate, filters.transactionTypes, filters.accountTypes]
  );
  
  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    // Clear tags and categories when filters change
    setTransactionTags(new Map());
    setTransactionCategories(new Map());
  }, [filterKey, queryClient]);
  
  // Check if any filters are active
  const hasActiveFilters = 
    (filters.accountIds && filters.accountIds.length > 0) ||
    (filters.tagIds && filters.tagIds.length > 0) ||
    (filters.categoryIds && filters.categoryIds.length > 0) ||
    filters.startDate !== null ||
    filters.endDate !== null ||
    (filters.transactionTypes && filters.transactionTypes.length > 0) ||
    (filters.accountTypes && filters.accountTypes.length > 0);
  
  // Use filter dates if available, otherwise don't filter by date
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useTransactionsPaginated(
    hasActiveFilters ? {
      accountIds: filters.accountIds && filters.accountIds.length > 0 ? filters.accountIds : undefined,
      accountId: filters.accountId || undefined,
      tagIds: filters.tagIds && filters.tagIds.length > 0 ? filters.tagIds : undefined,
      tagId: filters.tagId || undefined,
      categoryIds: filters.categoryIds && filters.categoryIds.length > 0 ? filters.categoryIds : undefined,
      categoryId: filters.categoryId || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      types: filters.transactionTypes && filters.transactionTypes.length > 0 ? filters.transactionTypes : undefined,
      type: filters.transactionType || undefined,
      accountTypes: filters.accountTypes && filters.accountTypes.length > 0 ? filters.accountTypes : undefined,
      accountType: filters.accountType || undefined,
    } : undefined
  );

  // Flatten paginated data
  const transactions = React.useMemo(() => {
    return data?.pages.flatMap((page) => page.transactions) || [];
  }, [data]);
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const [transactionTags, setTransactionTags] = React.useState<Map<number, Array<{ id: number; name: string }>>>(new Map());
  const [transactionCategories, setTransactionCategories] = React.useState<Map<number, string>>(new Map());
  const [refreshing, setRefreshing] = React.useState(false);

  // Load tags and categories only for new transactions (optimized for pagination)
  React.useEffect(() => {
    if (transactions.length > 0) {
      const loadTagsAndCategories = async () => {
        // Only load for transactions that don't have tags/categories yet
        const transactionsToLoad = transactions.filter(
          (t) => !transactionTags.has(t.id) && !transactionCategories.has(t.id)
        );

        if (transactionsToLoad.length === 0) return;

        const newTagsMap = new Map<number, Array<{ id: number; name: string }>>();
        const newCategoriesMap = new Map<number, string>();

        // Load in parallel batches
        const batchSize = 10;
        for (let i = 0; i < transactionsToLoad.length; i += batchSize) {
          const batch = transactionsToLoad.slice(i, i + batchSize);
          
          await Promise.all(
            batch.map(async (transaction) => {
              // Load tags (including deleted ones)
              const tags = await transactionTagRepository.findByTransactionId(transaction.id);
              const tagDetails = await Promise.all(
                tags.map(async (tt) => {
                  const tag = await tagRepository.findByIdIncludingDeleted(tt.tag_id);
                  if (!tag) return null;
                  const decryptedTag = await tagRepository.decryptTag(tag);
                  return { id: decryptedTag.id, name: decryptedTag.name };
                })
              );
              newTagsMap.set(
                transaction.id,
                tagDetails.filter((t): t is { id: number; name: string } => t !== null)
              );

              // Load category (including deleted ones)
              if (transaction.category_id) {
                const category = await categoryRepository.findByIdIncludingDeleted(transaction.category_id);
                if (category) {
                  const decryptedCategory = await categoryRepository.decryptCategory(category);
                  newCategoriesMap.set(transaction.id, decryptedCategory.name);
                }
              }
            })
          );
        }

        // Merge with existing maps
        setTransactionTags((prev) => new Map([...prev, ...newTagsMap]));
        setTransactionCategories((prev) => new Map([...prev, ...newCategoriesMap]));
      };
      loadTagsAndCategories();
    }
  }, [transactions]);

  const getAccountName = (accountId: number) => {
    return accounts?.find((a) => a.id === accountId)?.name || '';
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['tags'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, refetch]);

  const loadMore = React.useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleApplyFilters = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  // Header component
  const renderHeader = () => (
    <View className="px-5 pt-6">
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            Expenses
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            All transactions
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setCurrentFilterContext('expenses');
            router.push({ pathname: '/filters', params: { context: 'expenses' } });
          }}
          className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{ 
            backgroundColor: hasActiveFilters ? '#EFF6FF' : '#F3F4F6',
          }}
        >
          <Ionicons 
            name="filter" 
            size={20} 
            color={hasActiveFilters ? "#3B82F6" : "#6B7280"} 
          />
          {hasActiveFilters && (
            <View className="w-2 h-2 rounded-full bg-blue-600" />
          )}
        </TouchableOpacity>
      </View>

      <ActiveFilterChips context="expenses" />

      <TouchableOpacity
        onPress={() =>
          router.push({ pathname: '/expenses/add', params: { from: 'Expenses' } })
        }
        className="mb-6 bg-blue-600 rounded-2xl py-4 items-center flex-row justify-center"
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={24} color="#FFFFFF" />
        <Text className="text-white font-semibold ml-2">Add Transaction</Text>
      </TouchableOpacity>
    </View>
  );

  // Footer component for loading more
  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  };

  // Empty component
  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View className="px-5">
          <TransactionsListSkeleton count={8} />
        </View>
      );
    }
    return (
      <View className="px-5">
        <View className="bg-white dark:bg-gray-900 rounded-2xl p-8 items-center">
          <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-500 dark:text-gray-400 text-center mt-4 mb-6">
            No transactions yet
          </Text>
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: '/expenses/add', params: { from: 'Expenses' } })
            }
            className="bg-blue-600 rounded-2xl px-6 py-3"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold">Add Your First Transaction</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render transaction item
  const renderItem = ({ item: transaction }: { item: typeof transactions[0] }) => (
    <View className="px-5 mb-3">
      <TransactionItem
        id={transaction.id}
        amount={transaction.amount}
        type={transaction.type}
        date={transaction.date}
        note={transaction.note}
        payment_mode={transaction.payment_mode}
        accountName={getAccountName(transaction.account_id)}
        currencySymbol={getCurrencySymbol(settings.currency)}
        tags={transactionTags.get(transaction.id)}
        categoryName={transactionCategories.get(transaction.id)}
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing || isRefetching} 
            onRefresh={onRefresh} 
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}

