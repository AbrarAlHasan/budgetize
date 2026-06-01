import {
  AddCategoryBottomSheet,
  AddCategoryBottomSheetRef,
} from '@/components/add-category-bottom-sheet';
import {
  AddTagBottomSheet,
  AddTagBottomSheetRef,
} from '@/components/add-tag-bottom-sheet';
import { BottomSheetMultiSelect, BottomSheetMultiSelectRef } from '@/components/ui/bottom-sheet-multi-select';
import { BottomSheetSelect } from '@/components/ui/bottom-sheet-select';
import { useAccounts } from '@/hooks/queries/use-accounts';
import { useCategories } from '@/hooks/queries/use-categories';
import { useTags } from '@/hooks/queries/use-tags';
import { useCreateTransaction } from '@/hooks/queries/use-transactions';
import { useMarkInteractive } from '@/hooks/use-mark-interactive';
import { useSettingsStore } from '@/store/settings-store';
import {
  ParsedTransaction,
  processHDFCBankStatement,
  SupportedBank,
} from '@/utils/bank-statement-parser';
import { getCurrencySymbol } from '@/utils/currencies';
import { filterTransactionsByIncomePreference } from '@/utils/income-preference';
import { logError } from '@/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BankImportScreen() {
  useMarkInteractive();
  const params = useLocalSearchParams<{ fileUri: string; bank: SupportedBank }>();
  const queryClient = useQueryClient();
  const { settings } = useSettingsStore();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const createTransaction = useCreateTransaction();

  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [bankName, setBankName] = useState<string>('');
  const [pendingDeletes, setPendingDeletes] = useState<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set());
  const pendingDeletesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const accountSelectRefs = useRef<Map<string, any>>(new Map());
  const categorySelectRefs = useRef<Map<string, any>>(new Map());
  const tagSelectRefs = useRef<Map<string, BottomSheetMultiSelectRef>>(new Map());
  const addCategoryBottomSheetRef = useRef<AddCategoryBottomSheetRef>(null);
  const addTagBottomSheetRef = useRef<AddTagBottomSheetRef>(null);
  const editingCategoryTransactionId = useRef<string | null>(null);
  const editingTagTransactionId = useRef<string | null>(null);

  useEffect(() => {
    loadBankStatement();
  }, [params.fileUri]);

  // Sync ref with state
  useEffect(() => {
    pendingDeletesRef.current = pendingDeletes;
  }, [pendingDeletes]);

  // Cleanup pending delete timeouts on unmount
  useEffect(() => {
    return () => {
      pendingDeletesRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
    };
  }, []);

  const loadBankStatement = async () => {
    if (!params.fileUri) {
      Alert.alert('Error', 'No file provided');
      router.back();
      return;
    }

    try {
      setIsLoading(true);

      if (!params.bank) {
        Alert.alert('Error', 'Bank not specified');
        router.back();
        return;
      }

      // Process based on selected bank
      let result;
      if (params.bank === 'HDFC') {
        result = await processHDFCBankStatement(params.fileUri);
      } else {
        throw new Error(`Unsupported bank: ${params.bank}`);
      }

      if (result.bankName) {
        setBankName(result.bankName);
      }

      // Filter income transactions if income is disabled
      let filteredTransactions = result.transactions;
      if (!settings.incomeCalculationEnabled) {
        filteredTransactions = filterTransactionsByIncomePreference(
          result.transactions,
          false
        );
      }

      setTransactions(filteredTransactions);
    } catch (error) {
      logError('Failed to parse bank statement:', error);
      Alert.alert(
        'Parse Error',
        error instanceof Error
          ? error.message
          : 'Failed to parse bank statement file',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateTransaction = (
    id: string,
    updates: Partial<ParsedTransaction>
  ) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const deleteTransaction = (id: string) => {
    // Clear any existing pending delete for this transaction
    const existingTimeout = pendingDeletesRef.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      pendingDeletesRef.current.delete(id);
    }

    // Mark transaction as deleted (keep it in list but mark it)
    updateTransaction(id, { isDeleted: true });

    // Set up undo timeout (5 seconds)
    const timeoutId = setTimeout(() => {
      // Transaction is permanently deleted after timeout
      setTransactions((prev) => {
        // Double-check that the transaction still exists and is deleted
        const transaction = prev.find((t) => t.id === id);
        if (transaction && transaction.isDeleted) {
          return prev.filter((t) => t.id !== id);
        }
        return prev;
      });
      // Remove from ref and state
      pendingDeletesRef.current.delete(id);
      setPendingDeletes((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }, 5000);

    // Store timeout in both ref and state
    pendingDeletesRef.current.set(id, timeoutId);
    setPendingDeletes((prev) => {
      const newMap = new Map(prev);
      newMap.set(id, timeoutId);
      return newMap;
    });
  };

  const undoDelete = (id: string) => {
    const timeoutId = pendingDeletesRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      // Restore the transaction
      updateTransaction(id, { isDeleted: false });
      // Remove from ref and state
      pendingDeletesRef.current.delete(id);
      setPendingDeletes((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }
  };

  const toggleTransaction = (id: string) => {
    setExpandedTransactions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleAccountSelect = (transactionId: string, accountId: number) => {
    updateTransaction(transactionId, {
      accountId,
      isRequired: false,
    });
  };

  const handleCategorySelect = (
    transactionId: string,
    categoryId: number | null
  ) => {
    updateTransaction(transactionId, { categoryId });
  };

  const handleTagSelect = (transactionId: string, tagIds: number[]) => {
    updateTransaction(transactionId, { tagIds });
  };

  const handleAddCategory = (transactionId: string) => {
    editingCategoryTransactionId.current = transactionId;
    addCategoryBottomSheetRef.current?.present();
  };

  const handleAddTag = (transactionId: string) => {
    editingTagTransactionId.current = transactionId;
    addTagBottomSheetRef.current?.present();
  };

  const handleCategoryCreated = (categoryId: number) => {
    if (editingCategoryTransactionId.current) {
      updateTransaction(editingCategoryTransactionId.current, {
        categoryId,
      });
      editingCategoryTransactionId.current = null;
    }
  };

  const handleTagCreated = (tagId: number) => {
    if (editingTagTransactionId.current) {
      const transaction = transactions.find(
        (t) => t.id === editingTagTransactionId.current
      );
      if (transaction) {
        updateTransaction(editingTagTransactionId.current, {
          tagIds: [...transaction.tagIds, tagId],
        });
      }
      editingTagTransactionId.current = null;
    }
  };

  const handleConfirmImport = async () => {
    // Validate all transactions have accounts
    const invalidTransactions = transactions.filter(
      (t) => !t.isDeleted && !t.accountId
    );

    if (invalidTransactions.length > 0) {
      Alert.alert(
        'Missing Accounts',
        `Please select an account for all transactions. ${invalidTransactions.length} transaction(s) are missing an account.`
      );
      return;
    }

    // Filter out deleted transactions
    const transactionsToImport = transactions.filter((t) => !t.isDeleted);

    if (transactionsToImport.length === 0) {
      Alert.alert('No Transactions', 'No transactions to import.');
      return;
    }

    // Log transactions to import
    console.log('=== BANK IMPORT: Transactions to Import ===');
    console.log('Total transactions:', transactionsToImport.length);
    console.log('Transactions data:', JSON.stringify(transactionsToImport, null, 2));

    Alert.alert(
      'Confirm Import',
      `Import ${transactionsToImport.length} transaction(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            try {
              setIsImporting(true);
              let successCount = 0;
              let errorCount = 0;

              // Create transactions in batches
              for (const transaction of transactionsToImport) {
                if (!transaction.accountId) {
                  console.log('Skipping transaction (no account):', transaction.id);
                  continue;
                }

                try {
                  // Prepare transaction data
                  const transactionData = {
                    account_id: transaction.accountId,
                    category_id: transaction.categoryId,
                    amount: transaction.amount,
                    type: transaction.type,
                    date: transaction.date,
                    note: transaction.note || null,
                    payment_mode: transaction.paymentMode || null,
                    tag_ids:
                      transaction.tagIds.length > 0
                        ? transaction.tagIds
                        : undefined,
                  };

                  // Log transaction data being sent
                  console.log('=== Creating Transaction ===');
                  console.log('Transaction ID:', transaction.id);
                  console.log('Transaction Data:', JSON.stringify(transactionData, null, 2));
                  console.log('Original Transaction:', JSON.stringify(transaction, null, 2));

                  // Create transaction with tags (repository handles tag_ids)
                  const created = await createTransaction.mutateAsync(transactionData);

                  // Log created transaction
                  console.log('=== Transaction Created Successfully ===');
                  console.log('Created Transaction:', JSON.stringify(created, null, 2));

                  successCount++;
                } catch (error) {
                  console.error('=== Failed to Import Transaction ===');
                  console.error('Transaction ID:', transaction.id);
                  console.error('Transaction Data:', JSON.stringify(transaction, null, 2));
                  console.error('Error:', error);
                  logError('Failed to import transaction:', error);
                  errorCount++;
                }
              }

              console.log('=== Import Summary ===');
              console.log('Success Count:', successCount);
              console.log('Error Count:', errorCount);
              console.log('Total Processed:', successCount + errorCount);

              // Invalidate queries to refresh UI
              await queryClient.invalidateQueries();

              if (errorCount > 0) {
                Alert.alert(
                  'Import Partially Complete',
                  `Successfully imported ${successCount} transaction(s). ${errorCount} transaction(s) failed.`,
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              } else {
                Alert.alert(
                  'Import Complete',
                  `Successfully imported ${successCount} transaction(s).`,
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              }
            } catch (error) {
              logError('Import failed:', error);
              Alert.alert(
                'Import Failed',
                'Some transactions could not be imported. Please try again.'
              );
            } finally {
              setIsImporting(false);
            }
          },
        },
      ]
    );
  };

  const accountOptions =
    accounts?.map((acc) => ({
      label: acc.name,
      value: acc.id,
    })) || [];

  const categoryOptions = [
    { label: 'No Category', value: 'none' },
    ...(categories?.map((cat) => ({ label: cat.name, value: cat.id })) || []),
  ];

  const tagOptions =
    tags?.map((tag) => ({
      label: tag.name,
      value: tag.id,
    })) || [];

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" />
        <Text className="text-gray-500 dark:text-gray-400 mt-4">
          Parsing bank statement...
        </Text>
      </View>
    );
  }

  const validTransactions = transactions.filter((t) => !t.isDeleted);
  const hasInvalidTransactions = validTransactions.some((t) => !t.accountId);

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      className="flex-1 bg-gray-50 dark:bg-black"
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Review Transactions',
          headerBackTitle: 'Settings',
        }}
      />

      <View className="flex-1">
        {/* Summary Header */}
        <View className="px-5 pt-4 pb-3 bg-white dark:bg-gray-900">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {validTransactions.length} transaction{validTransactions.length !== 1 ? 's' : ''}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Ready to import
              </Text>
            </View>
            {bankName && (
              <View className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full">
                <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {bankName}
                </Text>
              </View>
            )}
          </View>
          {hasInvalidTransactions && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="alert-circle" size={14} color="#F97316" />
              <Text className="text-xs text-orange-600 dark:text-orange-400 ml-1.5">
                Select accounts for all transactions
              </Text>
            </View>
          )}
        </View>

        {/* Transactions List */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-5 py-3 gap-3">
            {transactions.map((transaction) => {
              // Show undo UI for deleted transactions
              if (transaction.isDeleted) {
                return (
                  <View
                    key={transaction.id}
                    className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 border-2 border-dashed border-gray-300 dark:border-gray-700"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        <Text className="text-sm text-gray-600 dark:text-gray-400 ml-2 flex-1">
                          Transaction deleted
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => undoDelete(transaction.id)}
                        className="ml-4 px-4 py-2 bg-blue-500 rounded-lg"
                        activeOpacity={0.7}
                      >
                        <Text className="text-white text-sm font-semibold">Undo</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }

              // Show normal transaction card
              const isExpanded = expandedTransactions.has(transaction.id);
              const account = accounts?.find((a) => a.id === transaction.accountId);
              const category = categories?.find((c) => c.id === transaction.categoryId);
              const selectedTags = transaction.tagIds
                .map((tagId) => tags?.find((t) => t.id === tagId))
                .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);

              return (
                <TouchableOpacity
                  key={transaction.id}
                  onPress={() => toggleTransaction(transaction.id)}
                  activeOpacity={0.95}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-4"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                    elevation: 2,
                  }}
                >
                  {!isExpanded ? (
                    // Collapsed View - Minimalist
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center gap-2 flex-wrap">
                        {/* Amount */}
                        <Text
                          className={`text-lg font-bold ${transaction.type === 'expense'
                              ? 'text-red-500 dark:text-red-400'
                              : 'text-green-500 dark:text-green-400'
                            }`}
                        >
                          {getCurrencySymbol(settings.currency || 'INR')}
                          {transaction.amount.toFixed(2)}
                        </Text>

                        {/* Account */}
                        {account && (
                          <View className="flex-row items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                            <Ionicons name="wallet-outline" size={12} color="#3B82F6" />
                            <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">
                              {account.name}
                            </Text>
                          </View>
                        )}

                        {/* Category */}
                        {category && (
                          <View className="flex-row items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-lg">
                            <Ionicons name="pricetag-outline" size={12} color="#9333EA" />
                            <Text className="text-xs font-medium text-purple-600 dark:text-purple-400">
                              {category.name}
                            </Text>
                          </View>
                        )}

                        {/* Tags */}
                        {selectedTags.length > 0 && (
                          <View className="flex-row items-center gap-1 flex-wrap">
                            {selectedTags.map((tag) => (
                              <View
                                key={tag.id}
                                className="flex-row items-center gap-1 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded"
                              >
                                <Ionicons name="pricetag-outline" size={10} color="#10B981" />
                                <Text className="text-xs font-medium text-green-700 dark:text-green-400">
                                  {tag.name}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Note */}
                        {transaction.note && (
                          <View className="flex-row items-center gap-1 max-w-[120px]">
                            <Ionicons name="document-text-outline" size={12} color="#6B7280" />
                            <Text
                              className="text-xs text-gray-600 dark:text-gray-400"
                              numberOfLines={1}
                            >
                              {transaction.note}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View className="flex-row items-center gap-2">
                        {transaction.isRequired && (
                          <View className="bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                            <Text className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                              Required
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            deleteTransaction(transaction.id);
                          }}
                          className="p-1.5"
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                        <Ionicons
                          name="chevron-down"
                          size={18}
                          color="#9CA3AF"
                          style={{ transform: [{ rotate: '0deg' }] }}
                        />
                      </View>
                    </View>
                  ) : (
                    // Expanded View - Full Details
                    <>
                      {/* Header: Amount, Date, Delete */}
                      <View className="flex-row justify-between items-start mb-4">
                        <View className="flex-1 pr-3">
                          <View className="flex-row items-baseline gap-2 mb-1.5">
                            <Text
                              className={`text-2xl font-bold ${transaction.type === 'expense'
                                  ? 'text-red-500 dark:text-red-400'
                                  : 'text-green-500 dark:text-green-400'
                                }`}
                            >
                              {getCurrencySymbol(settings.currency || 'INR')}
                              {transaction.amount.toFixed(2)}
                            </Text>
                            {transaction.isRequired && (
                              <View className="bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                                <Text className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                  Required
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            {format(parseISO(transaction.date), 'MMM dd, yyyy')}
                          </Text>
                          <Text
                            className="text-sm text-gray-800 dark:text-gray-200 leading-5"
                            numberOfLines={2}
                          >
                            {transaction.narration}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <TouchableOpacity
                            onPress={() => deleteTransaction(transaction.id)}
                            className="p-1.5"
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="trash-outline" size={22} color="#EF4444" />
                          </TouchableOpacity>
                          <Ionicons
                            name="chevron-up"
                            size={18}
                            color="#9CA3AF"
                          />
                        </View>
                      </View>

                      {/* Quick Actions Grid */}
                      <View className="gap-2.5">
                  {/* Account Selection */}
                  <TouchableOpacity
                    onPress={() => {
                      const ref = accountSelectRefs.current.get(transaction.id);
                      if (ref) ref.present();
                    }}
                    className="flex-row items-center justify-between py-2.5 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                  >
                    <View className="flex-row items-center flex-1">
                      <View className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-2.5">
                        <Ionicons name="wallet-outline" size={16} color="#3B82F6" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                          Account
                        </Text>
                        <Text
                          className={`text-sm font-medium ${transaction.accountId
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-orange-500 dark:text-orange-400'
                            }`}
                        >
                          {transaction.accountId
                            ? accounts?.find((a) => a.id === transaction.accountId)
                              ?.name || 'Unknown'
                            : 'Select account'}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </TouchableOpacity>

                  {/* Category Selection */}
                  <View className="py-2.5 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <View className="flex-row items-center justify-between mb-2">
                      <TouchableOpacity
                        onPress={() => {
                          const ref = categorySelectRefs.current.get(transaction.id);
                          if (ref) ref.present();
                        }}
                        className="flex-row items-center flex-1"
                      >
                        <View className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 items-center justify-center mr-2.5">
                          <Ionicons name="pricetag-outline" size={16} color="#9333EA" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                            Category
                          </Text>
                          <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {transaction.categoryId
                              ? categories?.find((c) => c.id === transaction.categoryId)
                                ?.name || 'Unknown'
                              : 'No category'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleAddCategory(transaction.id)}
                        className="ml-2 p-1.5"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="add-circle-outline" size={20} color="#9333EA" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Tags */}
                  <View className="py-2.5 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <View className="flex-row items-center justify-between mb-2">
                      <TouchableOpacity
                        onPress={() => {
                          const ref = tagSelectRefs.current.get(transaction.id);
                          if (ref) ref.present();
                        }}
                        className="flex-row items-center flex-1"
                      >
                        <View className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 items-center justify-center mr-2.5">
                          <Ionicons name="pricetags-outline" size={16} color="#10B981" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                            Tags
                          </Text>
                          {transaction.tagIds.length > 0 ? (
                            <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {transaction.tagIds.length} selected
                            </Text>
                          ) : (
                            <Text className="text-sm font-medium text-gray-400 dark:text-gray-500">
                              No tags
                            </Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleAddTag(transaction.id)}
                        className="ml-2 p-1.5"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
                      </TouchableOpacity>
                    </View>
                    {transaction.tagIds.length > 0 && (
                      <View className="flex-row flex-wrap gap-1.5 mt-1">
                        {transaction.tagIds.map((tagId) => {
                          const tag = tags?.find((t) => t.id === tagId);
                          if (!tag) return null;
                          return (
                            <TouchableOpacity
                              key={tag.id}
                              onPress={() => {
                                const newTagIds = transaction.tagIds.filter((id) => id !== tagId);
                                handleTagSelect(transaction.id, newTagIds);
                              }}
                              className="flex-row items-center gap-1 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-lg"
                            >
                              <Text className="text-xs text-green-700 dark:text-green-400 font-medium">
                                {tag.name}
                              </Text>
                              <Ionicons name="close-circle" size={14} color="#10B981" />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  {/* Note */}
                  <View className="pt-2.5 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <View className="flex-row items-center mb-2">
                      <View className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 items-center justify-center mr-2.5">
                        <Ionicons name="document-text-outline" size={16} color="#6B7280" />
                      </View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">
                        Note
                      </Text>
                    </View>
                    <TextInput
                      value={transaction.note}
                      onChangeText={(text) =>
                        updateTransaction(transaction.id, { note: text })
                      }
                      placeholder="Add a note..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      className="bg-white dark:bg-gray-900 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                      style={{ minHeight: 56, textAlignVertical: 'top' }}
                    />
                  </View>
                </View>

                      {/* Hidden Selectors */}
                      <View
                        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                      >
                        <BottomSheetSelect
                          ref={(ref) => {
                            if (ref)
                              accountSelectRefs.current.set(transaction.id, ref);
                          }}
                          label="Account"
                          options={accountOptions}
                          value={transaction.accountId}
                          onValueChange={(value) =>
                            handleAccountSelect(transaction.id, value as number)
                          }
                          placeholder="Select an account"
                        />
                        <BottomSheetSelect
                          ref={(ref) => {
                            if (ref)
                              categorySelectRefs.current.set(transaction.id, ref);
                          }}
                          label="Category"
                          options={categoryOptions}
                          value={transaction.categoryId || 'none'}
                          onValueChange={(value) =>
                            handleCategorySelect(
                              transaction.id,
                              value === 'none' ? null : (value as number)
                            )
                          }
                          placeholder="Select a category"
                        />
                        <BottomSheetMultiSelect
                          ref={(ref) => {
                            if (ref)
                              tagSelectRefs.current.set(transaction.id, ref);
                          }}
                          label="Tags"
                          options={tagOptions}
                          value={transaction.tagIds}
                          onValueChange={(values) =>
                            handleTagSelect(transaction.id, values as number[])
                          }
                          placeholder="Select tags"
                          showSelectAll={false}
                        />
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Confirm Button */}
        <View className="px-5 pt-4 pb-6 bg-white dark:bg-gray-900">
          <TouchableOpacity
            onPress={handleConfirmImport}
            disabled={
              isImporting ||
              validTransactions.length === 0 ||
              hasInvalidTransactions
            }
            className={`rounded-2xl py-4 px-6 items-center justify-center ${isImporting ||
                validTransactions.length === 0 ||
                hasInvalidTransactions
                ? 'bg-gray-200 dark:bg-gray-800'
                : 'bg-blue-500 dark:bg-blue-600'
              }`}
            style={{
              shadowColor: isImporting ||
                validTransactions.length === 0 ||
                hasInvalidTransactions
                ? 'transparent'
                : '#3B82F6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {isImporting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Confirm & Import {validTransactions.length > 0 && `(${validTransactions.length})`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Add Tag Bottom Sheet */}
      <AddCategoryBottomSheet
        ref={addCategoryBottomSheetRef}
        onCategoryCreated={handleCategoryCreated}
      />
      <AddTagBottomSheet
        ref={addTagBottomSheetRef}
        onTagCreated={handleTagCreated}
      />
    </SafeAreaView>
  );
}

