import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTransactions } from '@/hooks/queries/use-transactions';
import { TransactionItem } from '@/components/transaction-item';
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
  
  const { data: transactions, isLoading } = useTransactions({
    accountId: filters.accountId || undefined,
    tagId: filters.tagId || undefined,
    categoryId: filters.categoryId || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    type: filters.transactionType || undefined,
  });
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const [transactionTags, setTransactionTags] = React.useState<Map<number, Array<{ id: number; name: string }>>>(new Map());
  const [transactionCategories, setTransactionCategories] = React.useState<Map<number, string>>(new Map());
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (transactions) {
      const loadTagsAndCategories = async () => {
        const tagsMap = new Map<number, Array<{ id: number; name: string }>>();
        const categoriesMap = new Map<number, string>();
        for (const transaction of transactions) {
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
          tagsMap.set(transaction.id, tagDetails.filter((t): t is { id: number; name: string } => t !== null));
          
          // Load category (including deleted ones)
          if (transaction.category_id) {
            const category = await categoryRepository.findByIdIncludingDeleted(transaction.category_id);
            if (category) {
              const decryptedCategory = await categoryRepository.decryptCategory(category);
              categoriesMap.set(transaction.id, decryptedCategory.name);
            }
          }
        }
        setTransactionTags(tagsMap);
        setTransactionCategories(categoriesMap);
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['tags'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const handleApplyFilters = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const hasActiveFilters = 
    filters.accountId !== null ||
    filters.tagId !== null ||
    filters.categoryId !== null ||
    filters.startDate !== null ||
    filters.endDate !== null ||
    filters.transactionType !== null ||
    filters.accountType !== null;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-6 pb-6">
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

        {transactions && transactions.length > 0 ? (
          transactions.map((transaction) => (
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
          ))
        ) : (
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
        )}
        </View>
      </ScrollView>
      
    </SafeAreaView>
  );
}

