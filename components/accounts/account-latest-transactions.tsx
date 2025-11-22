import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, FadeIn, FadeOut } from 'react-native-reanimated';
import { transactionRepository } from '@/repositories/transaction.repository';
import { useSettingsStore } from '@/store/settings-store';
import { filterTransactionsByIncomePreference } from '@/utils/income-preference';
import { getCurrencySymbol } from '@/utils/currencies';
import { router } from 'expo-router';
import { TransactionItem } from '@/components/transaction-item';
import { RecentTransactionsSkeleton } from '@/components/skeletons';
import { useAccounts } from '@/hooks/queries/use-accounts';
import { useCategories } from '@/hooks/queries/use-categories';
import { categoryRepository } from '@/repositories/category.repository';
import { transactionTagRepository } from '@/repositories/transaction-tag.repository';
import { tagRepository } from '@/repositories/tag.repository';
import { useUIStore } from '@/store/ui-store';

interface AccountLatestTransactionsProps {
  accountId: number;
}

export function AccountLatestTransactions({ accountId }: AccountLatestTransactionsProps) {
  const { settings } = useSettingsStore();
  const incomeCalculationEnabled = useSettingsStore((state) => state.settings.incomeCalculationEnabled);
  const opacity = useSharedValue(1);
  const previousAccountId = React.useRef<number | null>(null);
  
  // Use optimized query to fetch only latest 5 transactions with keepPreviousData
  const { data: transactions, isLoading, isFetching } = useQuery({
    queryKey: ['account-latest-transactions', accountId],
    queryFn: async () => {
      const startTime = Date.now();
      console.log(`[Performance] AccountLatestTransactions query started for account ${accountId}`);
      
      // Fetch only latest 5 transactions directly from database
      const rawTransactions = await transactionRepository.findLatestTransactionsForAccount(accountId, 5);
      
      // Decrypt only the transactions we need
      const decrypted = await transactionRepository.decryptTransactions(rawTransactions);
      const filtered = filterTransactionsByIncomePreference(decrypted, incomeCalculationEnabled);
      
      const endTime = Date.now();
      console.log(`[Performance] AccountLatestTransactions query completed in ${endTime - startTime}ms (${filtered.length} transactions)`);
      
      return filtered;
    },
    enabled: !!accountId,
    keepPreviousData: true, // Keep previous data while fetching new data
    staleTime: 1000, // Consider data fresh for 1 second
  });

  // Animate opacity when account changes
  React.useEffect(() => {
    if (previousAccountId.current !== null && previousAccountId.current !== accountId) {
      // Fade out, then fade in when new data arrives
      opacity.value = withTiming(0.3, { duration: 200 }, () => {
        if (!isFetching) {
          opacity.value = withTiming(1, { duration: 300 });
        }
      });
    }
    previousAccountId.current = accountId;
  }, [accountId, isFetching, opacity]);

  // Fade in when data is ready
  React.useEffect(() => {
    if (!isFetching && transactions) {
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [isFetching, transactions, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const clearFilters = useUIStore((state) => state.clearFilters);
  const setAccountFilter = useUIStore((state) => state.setAccountFilter);
  const setCurrentFilterContext = useUIStore((state) => state.setCurrentFilterContext);

  const [transactionTags, setTransactionTags] = React.useState<Map<number, Array<{ id: number; name: string }>>>(new Map());
  const [transactionCategories, setTransactionCategories] = React.useState<Map<number, string>>(new Map());

  React.useEffect(() => {
    // Only load tags and categories for the transactions we actually display (max 5)
    if (transactions && transactions.length > 0) {
      const loadTagsAndCategories = async () => {
        const tagsMap = new Map<number, Array<{ id: number; name: string }>>();
        const categoriesMap = new Map<number, string>();
        
        // Collect all transaction IDs and category IDs first
        const transactionIds = transactions.map(t => t.id);
        const categoryIds = transactions
          .map(t => t.category_id)
          .filter((id): id is number => id !== null && id !== 0);
        
        // Load all transaction tags in parallel
        const allTransactionTags = await Promise.all(
          transactionIds.map(id => transactionTagRepository.findByTransactionId(id))
        );
        
        // Collect all unique tag IDs
        const tagIdsSet = new Set<number>();
        allTransactionTags.forEach(tags => {
          tags.forEach(tt => tagIdsSet.add(tt.tag_id));
        });
        const tagIds = Array.from(tagIdsSet);
        
        // Batch fetch all tags and categories
        const [allTags, allCategories] = await Promise.all([
          tagIds.length > 0 ? tagRepository.findByIdsIncludingDeleted(tagIds) : Promise.resolve([]),
          categoryIds.length > 0 ? categoryRepository.findByIdsIncludingDeleted(categoryIds) : Promise.resolve([]),
        ]);
        
        // Decrypt all tags and categories in parallel
        const [decryptedTags, decryptedCategories] = await Promise.all([
          tagRepository.decryptTags(allTags),
          categoryRepository.decryptCategories(allCategories),
        ]);
        
        // Create lookup maps
        const tagMap = new Map(decryptedTags.map(t => [t.id, t]));
        const categoryMap = new Map(decryptedCategories.map(c => [c.id, c]));
        
        // Map tags and categories back to transactions
        transactions.forEach((transaction, index) => {
          const transactionTagIds = allTransactionTags[index];
          const tagDetails = transactionTagIds
            .map(tt => {
              const tag = tagMap.get(tt.tag_id);
              return tag ? { id: tag.id, name: tag.name } : null;
            })
            .filter((t): t is { id: number; name: string } => t !== null);
          tagsMap.set(transaction.id, tagDetails);
          
          if (transaction.category_id) {
            const category = categoryMap.get(transaction.category_id);
            if (category) {
              categoriesMap.set(transaction.id, category.name);
            }
          }
        });
        
        setTransactionTags(tagsMap);
        setTransactionCategories(categoriesMap);
      };
      loadTagsAndCategories();
    }
  }, [transactions]);

  const getAccountName = (accountId: number) => {
    return accounts?.find((a) => a.id === accountId)?.name || '';
  };

  // Transactions are already limited to 5 by pagination
  const latestTransactions = transactions || [];

  return (
    <Animated.View 
      className="mt-5 mx-5"
      style={animatedStyle}
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons name="time-outline" size={20} color="#6B7280" />
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Latest Transactions
          </Text>
        </View>
        {!isLoading && transactions && transactions.length >= 5 && (
          <TouchableOpacity
            onPress={() => {
              clearFilters('expenses');
              setAccountFilter('expenses', accountId);
              setCurrentFilterContext('expenses');
              router.push('/expenses');
            }}
            className="flex-row items-center gap-1"
            activeOpacity={0.7}
          >
            <Text className="text-sm font-semibold text-blue-600">View All</Text>
            <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading && !transactions ? (
        <RecentTransactionsSkeleton />
      ) : latestTransactions && latestTransactions.length > 0 ? (
        <Animated.View entering={FadeIn.duration(300)}>
          {latestTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
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
          ))}
        </Animated.View>
      ) : !isLoading ? (
        <Animated.View 
          className="bg-white dark:bg-gray-900 rounded-2xl p-8 items-center"
          entering={FadeIn.duration(300)}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mb-4">
            <Ionicons name="receipt-outline" size={40} color="#9CA3AF" />
          </View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Recent Transactions
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            Start tracking your expenses to see them here
          </Text>
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: '/expenses/add', params: { from: 'Accounts', accountId: accountId.toString() } })
            }
            className="bg-blue-600 rounded-2xl px-6 py-3"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold">Add Transaction</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

