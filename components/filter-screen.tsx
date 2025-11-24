import { AccountType, TransactionType } from '@/db/schema/types';
import { useAccounts } from '@/hooks/queries/use-accounts';
import { useCategories } from '@/hooks/queries/use-categories';
import { useTags } from '@/hooks/queries/use-tags';
import { useUIStore, type FilterContext } from '@/store/ui-store';
import { Ionicons } from '@expo/vector-icons';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatePicker } from './date-picker';
import { TagChip } from './tag-chip';
import { Button } from './ui/button';
import { BottomSheetSelect } from './ui/bottom-sheet-select';
import { Card } from './ui/card';

interface FilterScreenProps {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  context?: FilterContext;
}

export function FilterScreen({ visible, onClose, onApply, context = 'dashboard' }: FilterScreenProps) {
  const filters = useUIStore((state) => state.filters[context]);
  const setAccountFilter = useUIStore((state) => state.setAccountFilter);
  const setTagFilter = useUIStore((state) => state.setTagFilter);
  const setCategoryFilter = useUIStore((state) => state.setCategoryFilter);
  const setDateRangeFilter = useUIStore((state) => state.setDateRangeFilter);
  const setTransactionTypeFilter = useUIStore((state) => state.setTransactionTypeFilter);
  const setAccountTypeFilter = useUIStore((state) => state.setAccountTypeFilter);
  const clearFilters = useUIStore((state) => state.clearFilters);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  // Local state for ALL filters (updates immediately, syncs to store on Apply)
  const [startDate, setStartDate] = useState<Date | null>(
    filters.startDate ? new Date(filters.startDate) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    filters.endDate ? new Date(filters.endDate) : null
  );
  const [localAccountId, setLocalAccountId] = useState<number | null>(filters.accountId);
  const [localCategoryId, setLocalCategoryId] = useState<number | null>(filters.categoryId);
  const [localTagId, setLocalTagId] = useState<number | null>(filters.tagId);
  const [localTransactionType, setLocalTransactionType] = useState<TransactionType | null>(filters.transactionType);
  const [localAccountType, setLocalAccountType] = useState<AccountType | null>(filters.accountType);

  // Initialize local state when filters change from outside (e.g., clear filters)
  useEffect(() => {
    setStartDate(filters.startDate ? new Date(filters.startDate) : null);
    setEndDate(filters.endDate ? new Date(filters.endDate) : null);
    setLocalAccountId(filters.accountId);
    setLocalCategoryId(filters.categoryId);
    setLocalTagId(filters.tagId);
    setLocalTransactionType(filters.transactionType);
    setLocalAccountType(filters.accountType);
  }, [filters.startDate, filters.endDate, filters.accountId, filters.categoryId, filters.tagId, filters.transactionType, filters.accountType]);

  const transactionTypeOptions = [
    { label: 'All Types', value: 'all' },
    { label: 'Expense', value: 'expense' },
    { label: 'Income', value: 'income' },
  ];

  const accountTypeOptions = [
    { label: 'All Account Types', value: 'all' },
    { label: 'Debit', value: 'debit' },
    { label: 'Credit', value: 'credit' },
    { label: 'Borrowed', value: 'borrowed' },
    { label: 'Lent', value: 'lent' },
  ];

  const categoryOptions = [
    { label: 'All Categories', value: 'all' },
    ...(categories?.map((cat) => ({ label: cat.name, value: cat.id })) || []),
  ];

  const accountOptions = [
    { label: 'All Accounts', value: 'all' },
    ...(accounts?.map((acc) => ({ label: acc.name, value: acc.id })) || []),
  ];

  const handleApply = () => {
    // Sync all local state to the filter store
    // If only one date is selected, use it for both start and end to filter for that single day
    if (startDate && endDate) {
      setDateRangeFilter(context, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));
    } else if (startDate) {
      // If only start date is selected, use it for both start and end
      const dateStr = format(startDate, 'yyyy-MM-dd');
      setDateRangeFilter(context, dateStr, dateStr);
    } else if (endDate) {
      // If only end date is selected, use it for both start and end
      const dateStr = format(endDate, 'yyyy-MM-dd');
      setDateRangeFilter(context, dateStr, dateStr);
    } else {
      setDateRangeFilter(context, null, null);
    }
    
    setAccountFilter(context, localAccountId);
    setCategoryFilter(context, localCategoryId);
    setTagFilter(context, localTagId);
    setTransactionTypeFilter(context, localTransactionType);
    setAccountTypeFilter(context, localAccountType);
    
    onApply();
    onClose();
  };

  const handleClear = () => {
    // Clear both local state and store
    setStartDate(null);
    setEndDate(null);
    setLocalAccountId(null);
    setLocalCategoryId(null);
    setLocalTagId(null);
    setLocalTransactionType(null);
    setLocalAccountType(null);
    clearFilters(context);
  };

  const handleQuickFilter = (type: 'today' | 'week' | 'month' | 'year') => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (type) {
      case 'today':
        start = today;
        break;
      case 'week':
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        break;
      case 'month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
    }

    setStartDate(start);
    setEndDate(end);
  };

  const hasActiveFilters = 
    localAccountId !== null ||
    localTagId !== null ||
    localCategoryId !== null ||
    startDate !== null ||
    endDate !== null ||
    localTransactionType !== null ||
    localAccountType !== null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Filters
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1">
            <View className="p-4">
              {/* Quick Date Filters */}
              <Card className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Quick Filters
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onPress={() => handleQuickFilter('today')}
                    className="flex-1 min-w-[80px]"
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => handleQuickFilter('week')}
                    className="flex-1 min-w-[80px]"
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => handleQuickFilter('month')}
                    className="flex-1 min-w-[80px]"
                  >
                    This Month
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => handleQuickFilter('year')}
                    className="flex-1 min-w-[80px]"
                  >
                    This Year
                  </Button>
                </View>
              </Card>

              {/* Date Range */}
              <Card className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Date Range
                </Text>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(date) => {
                    setStartDate(date);
                    // If end date is before new start date, clear it
                    if (endDate && date && date > endDate) {
                      setEndDate(null);
                    }
                  }}
                />
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(date) => setEndDate(date)}
                  minDate={startDate || undefined}
                />
              </Card>

              {/* Transaction Type */}
              <Card className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Transaction Type
                </Text>
                <BottomSheetSelect
                  options={transactionTypeOptions}
                  value={localTransactionType || 'all'}
                  onValueChange={(value) => {
                    setLocalTransactionType(value === 'all' ? null : (value as TransactionType));
                  }}
                  placeholder="Select transaction type"
                />
              </Card>

              {/* Account */}
              <Card className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Account
                </Text>
                <BottomSheetSelect
                  options={accountOptions}
                  value={localAccountId || 'all'}
                  onValueChange={(value) => {
                    setLocalAccountId(value === 'all' ? null : (value as number));
                  }}
                  placeholder="Select account"
                />
              </Card>

              {/* Account Type */}
              <Card className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Account Type
                </Text>
                <BottomSheetSelect
                  options={accountTypeOptions}
                  value={localAccountType || 'all'}
                  onValueChange={(value) => {
                    setLocalAccountType(value === 'all' ? null : (value as AccountType));
                  }}
                  placeholder="Select account type"
                />
              </Card>

              {/* Category */}
              <Card className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Category
                </Text>
                <BottomSheetSelect
                  options={categoryOptions}
                  value={localCategoryId || 'all'}
                  onValueChange={(value) => {
                    setLocalCategoryId(value === 'all' ? null : (value as number));
                  }}
                  placeholder="Select category"
                />
              </Card>

              {/* Tags */}
              {tags && tags.length > 0 && (
                <Card className="mb-4">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Tags
                  </Text>
                  <View className="flex-row flex-wrap gap-3">
                    {tags.map((tag) => (
                      <TagChip
                        key={tag.id}
                        name={tag.name}
                        selected={localTagId === tag.id}
                        onPress={() => {
                          setLocalTagId(localTagId === tag.id ? null : tag.id);
                        }}
                      />
                    ))}
                  </View>
                </Card>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  variant="outline"
                  onPress={handleClear}
                  disabled={!hasActiveFilters}
                >
                  Clear All
                </Button>
              </View>
              <View className="flex-1">
                <Button onPress={handleApply}>
                  Apply Filters
                </Button>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

