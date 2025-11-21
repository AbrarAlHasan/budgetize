import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
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
  const incomeCalculationEnabled = useSettingsStore((state) => state.incomeCalculationEnabled);
  
  // Use optimized query to fetch only latest 5 transactions
  const { data: transactions, isLoading } = useQuery({
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
        
        // Only process the transactions we're displaying (already limited to 5 by pagination)
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

  // Transactions are already limited to 5 by pagination
  const latestTransactions = transactions;

  return (
    <View className="mt-5 mx-5">
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

      {isLoading ? (
        <RecentTransactionsSkeleton />
      ) : latestTransactions.length > 0 ? (
        <>
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
        </>
      ) : (
        <View className="bg-white dark:bg-gray-900 rounded-2xl p-8 items-center"
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
        </View>
      )}
    </View>
  );
}

