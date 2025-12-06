import { AccountType, TransactionType } from '@/db/schema/types';
import { useAccounts } from '@/hooks/queries/use-accounts';
import { useCategories } from '@/hooks/queries/use-categories';
import { useTags } from '@/hooks/queries/use-tags';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUIStore, type FilterContext } from '@/store/ui-store';
import { Ionicons } from '@expo/vector-icons';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatePicker } from './date-picker';
import { TagChip } from './tag-chip';
import { BottomSheetSelect } from './ui/bottom-sheet-select';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface FilterScreenProps {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  context?: FilterContext;
}

export function FilterScreen({ visible, onClose, onApply, context = 'dashboard' }: FilterScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const quickFiltersScrollRef = useRef<ScrollView>(null);
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

  // Get current month as default (memoized)
  const getCurrentMonthDates = React.useMemo(() => {
    const now = new Date();
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
    };
  }, []);

  // Local state for ALL filters (updates immediately, syncs to store on Apply)
  // Dates are mandatory - default to current month if not set
  const [startDate, setStartDate] = useState<Date>(
    filters.startDate ? new Date(filters.startDate) : getCurrentMonthDates.start
  );
  const [endDate, setEndDate] = useState<Date>(
    filters.endDate ? new Date(filters.endDate) : getCurrentMonthDates.end
  );
  const [localAccountId, setLocalAccountId] = useState<number | null>(filters.accountId);
  const [localCategoryId, setLocalCategoryId] = useState<number | null>(filters.categoryId);
  const [localTagId, setLocalTagId] = useState<number | null>(filters.tagId);
  const [localTransactionType, setLocalTransactionType] = useState<TransactionType | null>(filters.transactionType);
  const [localAccountType, setLocalAccountType] = useState<AccountType | null>(filters.accountType);

  // Initialize local state when filters change from outside (e.g., clear filters)
  useEffect(() => {
    setStartDate(filters.startDate ? new Date(filters.startDate) : getCurrentMonthDates.start);
    setEndDate(filters.endDate ? new Date(filters.endDate) : getCurrentMonthDates.end);
    setLocalAccountId(filters.accountId);
    setLocalCategoryId(filters.categoryId);
    setLocalTagId(filters.tagId);
    setLocalTransactionType(filters.transactionType);
    setLocalAccountType(filters.accountType);
  }, [filters.startDate, filters.endDate, filters.accountId, filters.categoryId, filters.tagId, filters.transactionType, filters.accountType, getCurrentMonthDates]);

  // Animate quick filters scroll to indicate scrollability
  useEffect(() => {
    if (visible && quickFiltersScrollRef.current) {
      // Delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        // Scroll to the right
        quickFiltersScrollRef.current?.scrollTo({ x: 100, animated: true });
        
        // Then scroll back to the left after a short delay
        setTimeout(() => {
          quickFiltersScrollRef.current?.scrollTo({ x: 0, animated: true });
        }, 600);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [visible]);

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
    // Dates are mandatory - always set them (should never be null, but ensure they're set)
    const finalStartDate = startDate || getCurrentMonthDates.start;
    const finalEndDate = endDate || getCurrentMonthDates.end;
    
    setDateRangeFilter(
      context,
      format(finalStartDate, 'yyyy-MM-dd'),
      format(finalEndDate, 'yyyy-MM-dd')
    );
    
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
    // Dates reset to current month (mandatory)
    setStartDate(getCurrentMonthDates.start);
    setEndDate(getCurrentMonthDates.end);
    setLocalAccountId(null);
    setLocalCategoryId(null);
    setLocalTagId(null);
    setLocalTransactionType(null);
    setLocalAccountType(null);
    clearFilters(context); // This will also reset dates to current month
  };

  const handleQuickFilter = (type: 'today' | 'week' | 'month' | 'lastMonth' | 'last3Months' | 'last6Months' | 'year') => {
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
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'last3Months':
        start = startOfMonth(subMonths(today, 2));
        end = endOfMonth(today);
        break;
      case 'last6Months':
        start = startOfMonth(subMonths(today, 5));
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

  // Check if any filters are active (dates are always set, so only count if not default)
  const isDefaultDateRange = 
    format(startDate, 'yyyy-MM-dd') === format(getCurrentMonthDates.start, 'yyyy-MM-dd') &&
    format(endDate, 'yyyy-MM-dd') === format(getCurrentMonthDates.end, 'yyyy-MM-dd');
  
  const hasActiveFilters = 
    localAccountId !== null ||
    localTagId !== null ||
    localCategoryId !== null ||
    !isDefaultDateRange ||
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
              <View className="mb-4">
                <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">
                  Quick Filters
                </Text>
                <ScrollView 
                  ref={quickFiltersScrollRef}
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 4 }}
                >
                  <View className="flex-row" style={{ gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => handleQuickFilter('today')}
                      activeOpacity={0.7}
                      className="rounded-lg px-3 py-1.5 border"
                      style={{
                        backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE',
                        borderColor: isDark ? '#3B82F6' : '#93C5FD',
                        borderWidth: 1,
                        borderRadius: 8,
                      }}
                    >
                      <Text className="text-xs font-medium" style={{ color: isDark ? '#93C5FD' : '#1E40AF' }}>
                        Today
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleQuickFilter('week')}
                      activeOpacity={0.7}
                      className="rounded-lg px-3 py-1.5 border"
                      style={{
                        backgroundColor: isDark ? '#581C87' : '#F3E8FF',
                        borderColor: isDark ? '#8B5CF6' : '#C4B5FD',
                        borderWidth: 1,
                        borderRadius: 8,
                      }}
                    >
                      <Text className="text-xs font-medium" style={{ color: isDark ? '#C4B5FD' : '#6B21A8' }}>
                        7 Days
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleQuickFilter('month')}
                      activeOpacity={0.7}
                      className="rounded-lg px-3 py-1.5 border"
                      style={{
                        backgroundColor: isDark ? '#064E3B' : '#D1FAE5',
                        borderColor: isDark ? '#10B981' : '#6EE7B7',
                        borderWidth: 1,
                        borderRadius: 8,
                      }}
                    >
                      <Text className="text-xs font-medium" style={{ color: isDark ? '#6EE7B7' : '#065F46' }}>
                        This Month
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleQuickFilter('lastMonth')}
                      activeOpacity={0.7}
                      className="rounded-lg px-3 py-1.5 border"
                      style={{
                        backgroundColor: isDark ? '#7C2D12' : '#FED7AA',
                        borderColor: isDark ? '#F59E0B' : '#FCD34D',
                        borderWidth: 1,
                        borderRadius: 8,
                      }}
                    >
                      <Text className="text-xs font-medium" style={{ color: isDark ? '#FCD34D' : '#92400E' }}>
                        Last Month
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleQuickFilter('last3Months')}
                      activeOpacity={0.7}
                      className="rounded-lg px-3 py-1.5 border"
                      style={{
                        backgroundColor: isDark ? '#831843' : '#FCE7F3',
                        borderColor: isDark ? '#EC4899' : '#F9A8D4',
                        borderWidth: 1,
                        borderRadius: 8,
                      }}
                    >
                      <Text className="text-xs font-medium" style={{ color: isDark ? '#F9A8D4' : '#9F1239' }}>
                        3 Months
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleQuickFilter('last6Months')}
                      activeOpacity={0.7}
                      className="rounded-lg px-3 py-1.5 border"
                      style={{
                        backgroundColor: isDark ? '#312E81' : '#E0E7FF',
                        borderColor: isDark ? '#6366F1' : '#A5B4FC',
                        borderWidth: 1,
                        borderRadius: 8,
                      }}
                    >
                      <Text className="text-xs font-medium" style={{ color: isDark ? '#A5B4FC' : '#3730A3' }}>
                        6 Months
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleQuickFilter('year')}
                      activeOpacity={0.7}
                      className="rounded-lg px-3 py-1.5 border"
                      style={{
                        backgroundColor: isDark ? '#164E63' : '#CFFAFE',
                        borderColor: isDark ? '#06B6D4' : '#67E8F9',
                        borderWidth: 1,
                        borderRadius: 8,
                      }}
                    >
                      <Text className="text-xs font-medium" style={{ color: isDark ? '#67E8F9' : '#164E63' }}>
                        This Year
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>

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
                    // If end date is before new start date, reset it to current month end
                    if (endDate && date && date > endDate) {
                      setEndDate(getCurrentMonthDates.end);
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

