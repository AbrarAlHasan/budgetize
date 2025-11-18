import { DatePicker } from '@/components/date-picker';
import { TagChip } from '@/components/tag-chip';
import { AddTagBottomSheet, AddTagBottomSheetRef } from '@/components/add-tag-bottom-sheet';
import { BottomSheetSelect } from '@/components/ui/bottom-sheet-select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TransactionType } from '@/db/schema/types';
import { useAccounts } from '@/hooks/queries/use-accounts';
import { useCategories } from '@/hooks/queries/use-categories';
import { useTags } from '@/hooks/queries/use-tags';
import { useCreateTransaction } from '@/hooks/queries/use-transactions';
import { useSettingsStore } from '@/store/settings-store';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function AddTransactionScreen() {
  const createTransaction = useCreateTransaction();
  const { data: accounts } = useAccounts();
  const { data: tags } = useTags();
  const { data: categories } = useCategories();

  // Refs for bottom sheet selects
  const typeSelectRef = useRef<any>(null);
  const accountSelectRef = useRef<any>(null);
  const categorySelectRef = useRef<any>(null);
  const addTagBottomSheetRef = useRef<AddTagBottomSheetRef>(null);

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [note, setNote] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const params = useLocalSearchParams<{ from?: string }>();
  const originLabel = params.from ?? 'Back';
  const { settings, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);

  const transactionTypeOptions = settings.incomeCalculationEnabled
    ? [
        { label: 'Expense', value: 'expense' },
        { label: 'Income', value: 'income' },
      ]
    : [{ label: 'Expense', value: 'expense' }];

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
      await createTransaction.mutateAsync({
        account_id: accountId,
        category_id: categoryId,
        amount: amountValue,
        type,
        date: format(date, 'yyyy-MM-dd'),
        note: note.trim() || null,
        payment_mode: paymentMode.trim(),
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      });
      Alert.alert('Success', 'Transaction created successfully');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to create transaction');
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleTagCreated = (tagId: number) => {
    setSelectedTagIds((prev) => [...prev, tagId]);
  };

  const handleOpenAddTag = () => {
    addTagBottomSheetRef.current?.present();
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Add Transaction',
          headerBackTitle: originLabel,
        }}
      />
      <ScrollView className="flex-1">
        <View className="p-4">
          <Card>
          <Input
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
          />

          <BottomSheetSelect
            ref={typeSelectRef}
            label="Type"
            options={transactionTypeOptions}
            value={type}
            onValueChange={(value) => setType(value as TransactionType)}
          />

          <BottomSheetSelect
            ref={accountSelectRef}
            label="Account"
            options={accountOptions}
            value={accountId}
            onValueChange={(value) => setAccountId(value as number)}
            placeholder="Select an account"
          />

          <BottomSheetSelect
            ref={categorySelectRef}
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
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tags
              </Text>
              <TouchableOpacity
                onPress={handleOpenAddTag}
                className="flex-row items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-lg"
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="add-circle" 
                  size={20} 
                  color="#3B82F6" 
                />
                <Text className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  Add Tag
                </Text>
              </TouchableOpacity>
            </View>

            {tags && tags.length > 0 && (
              <View className="flex-row flex-wrap gap-3">
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

            {(!tags || tags.length === 0) && (
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                No tags yet. Click "Add Tag" to create one.
              </Text>
            )}
          </View>

          <View className="mt-4">
            <Button
              onPress={handleSave}
              loading={createTransaction.isPending}
            >
              Create Transaction
            </Button>
          </View>
        </Card>
      </View>
      </ScrollView>

      {/* Add Tag Bottom Sheet */}
      <AddTagBottomSheet 
        ref={addTagBottomSheetRef} 
        onTagCreated={handleTagCreated}
      />
    </View>
  );
}

