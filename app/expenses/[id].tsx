import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, Text, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTransaction, useUpdateTransaction, useDeleteTransaction } from '@/hooks/queries/use-transactions';
import { useAccounts } from '@/hooks/queries/use-accounts';
import { useTags, useCreateTag } from '@/hooks/queries/use-tags';
import { useCategories } from '@/hooks/queries/use-categories';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePicker } from '@/components/date-picker';
import { TagChip } from '@/components/tag-chip';
import { format, parseISO } from 'date-fns';
import { TransactionType } from '@/db/schema/types';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { transactionTagRepository } from '@/repositories/transaction-tag.repository';

export default function TransactionDetailScreen() {
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = parseInt(id || '0', 10);

  const { data: transaction, isLoading } = useTransaction(transactionId);
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const { data: accounts } = useAccounts();
  const { data: tags } = useTags();
  const { data: categories } = useCategories();
  const createTag = useCreateTag();
  const [refreshing, setRefreshing] = useState(false);

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [note, setNote] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setType(transaction.type);
      setAccountId(transaction.account_id);
      setCategoryId(transaction.category_id);
      setDate(parseISO(transaction.date));
      setNote(transaction.note || '');
      setPaymentMode(transaction.payment_mode);
    }
  }, [transaction]);

  // Load tags for this transaction
  useEffect(() => {
    if (transaction) {
      const loadTags = async () => {
        const transactionTags = await transactionTagRepository.findByTransactionId(transaction.id);
        const tagIds = transactionTags.map(tt => tt.tag_id);
        setSelectedTagIds(tagIds);
      };
      loadTags();
    }
  }, [transaction]);

  const transactionTypeOptions = [
    { label: 'Expense', value: 'expense' },
    { label: 'Income', value: 'income' },
  ];

  const accountOptions =
    accounts?.map((acc) => ({ label: acc.name, value: acc.id })) || [];

  const categoryOptions = [
    { label: 'No Category', value: 'none' },
    ...(categories?.map((cat) => ({ label: cat.name, value: cat.id })) || []),
  ];

  const handleSave = async () => {
    if (!amount.trim()) {
      Alert.alert('Error', 'Amount is required');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!accountId) {
      Alert.alert('Error', 'Please select an account');
      return;
    }

    if (!paymentMode.trim()) {
      Alert.alert('Error', 'Payment mode is required');
      return;
    }

    try {
      await updateTransaction.mutateAsync({
        id: transactionId,
        account_id: accountId,
        category_id: categoryId,
        amount: amountValue,
        type,
        date: format(date, 'yyyy-MM-dd'),
        note: note.trim() || null,
        payment_mode: paymentMode.trim(),
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      });
      Alert.alert('Success', 'Transaction updated successfully');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update transaction');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction.mutateAsync(transactionId);
              Alert.alert('Success', 'Transaction deleted successfully');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert('Error', 'Tag name is required');
      return;
    }

    // Check if tag already exists
    if (tags?.some((tag) => tag.name.toLowerCase() === newTagName.trim().toLowerCase())) {
      Alert.alert('Error', 'Tag with this name already exists');
      return;
    }

    try {
      const newTag = await createTag.mutateAsync({ name: newTagName.trim() });
      setSelectedTagIds((prev) => [...prev, newTag.id]);
      setNewTagName('');
      setShowAddTag(false);
      Alert.alert('Success', 'Tag created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create tag');
    }
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

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!transaction) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-gray-500 dark:text-gray-400">Transaction not found</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="p-4">
        <Card>
          <Input
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
          />

          <Select
            label="Type"
            options={transactionTypeOptions}
            value={type}
            onValueChange={(value) => setType(value as TransactionType)}
          />

          <Select
            label="Account"
            options={accountOptions}
            value={accountId}
            onValueChange={(value) => setAccountId(value as number)}
            placeholder="Select an account"
          />

          <Select
            label="Category"
            options={categoryOptions}
            value={categoryId || 'none'}
            onValueChange={(value) => setCategoryId(value === 'none' ? null : (value as number))}
            placeholder="Select a category"
          />

          <DatePicker
            label="Date"
            value={date}
            onChange={setDate}
          />

          <Input
            label="Payment Mode"
            value={paymentMode}
            onChangeText={setPaymentMode}
            placeholder="e.g., Cash, Card, UPI"
          />

          <Input
            label="Note"
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (optional)"
            multiline
            numberOfLines={3}
          />

          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tags
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddTag(!showAddTag)}
                className="flex-row items-center gap-1"
              >
                <Ionicons 
                  name={showAddTag ? "close-circle" : "add-circle"} 
                  size={20} 
                  color="#3B82F6" 
                />
                <Text className="text-sm text-blue-600 dark:text-blue-400">
                  {showAddTag ? 'Cancel' : 'Add Tag'}
                </Text>
              </TouchableOpacity>
            </View>

            {showAddTag && (
              <View className="mb-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Input
                  label="New Tag Name"
                  value={newTagName}
                  onChangeText={setNewTagName}
                  placeholder="Enter tag name"
                  autoFocus
                />
                <Button
                  onPress={handleAddTag}
                  loading={createTag.isPending}
                  className="mt-2"
                  variant="outline"
                >
                  Create Tag
                </Button>
              </View>
            )}

            {tags && tags.length > 0 && (
              <View className="flex-row flex-wrap gap-2">
                {tags.map((tag) => (
                  <TagChip
                    key={tag.id}
                    name={tag.name}
                    selected={selectedTagIds.includes(tag.id)}
                    onPress={() => toggleTag(tag.id)}
                  />
                ))}
              </View>
            )}

            {(!tags || tags.length === 0) && !showAddTag && (
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                No tags yet. Click "Add Tag" to create one.
              </Text>
            )}
          </View>

          <View className="flex-row gap-2 mt-4">
            <Button
              onPress={handleSave}
              loading={updateTransaction.isPending}
              className="flex-1"
            >
              Save
            </Button>
            <Button
              onPress={handleDelete}
              variant="outline"
              loading={deleteTransaction.isPending}
              className="flex-1"
            >
              Delete
            </Button>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

