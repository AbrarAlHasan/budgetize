import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface TransactionItemProps {
  id: number;
  amount: number;
  type: 'expense' | 'income';
  date: string;
  note?: string | null;
  payment_mode: string;
  accountName?: string;
  tags?: Array<{ id: number; name: string }>;
  categoryName?: string;
}

const getCategoryIcon = (categoryName?: string, paymentMode?: string): string => {
  if (categoryName) {
    const category = categoryName.toLowerCase();
    if (category.includes('food') || category.includes('restaurant')) return 'restaurant';
    if (category.includes('transport') || category.includes('car')) return 'car';
    if (category.includes('medicine') || category.includes('health')) return 'medical';
    if (category.includes('shopping')) return 'bag';
    if (category.includes('entertainment')) return 'game-controller';
    if (category.includes('bills')) return 'receipt';
    if (category.includes('education')) return 'school';
  }
  if (paymentMode) {
    const mode = paymentMode.toLowerCase();
    if (mode.includes('card')) return 'card';
    if (mode.includes('cash')) return 'cash';
    if (mode.includes('upi')) return 'phone-portrait';
  }
  return 'ellipse';
};

export function TransactionItem({
  id,
  amount,
  type,
  date,
  note,
  payment_mode,
  accountName,
  tags,
  categoryName,
}: TransactionItemProps) {
  const isExpense = type === 'expense';
  const amountColor = isExpense ? 'text-red-500' : 'text-green-500';
  const amountPrefix = isExpense ? '-' : '+';
  const iconName = getCategoryIcon(categoryName, payment_mode);
  const iconColor = isExpense ? '#EF4444' : '#10B981';

  return (
    <TouchableOpacity
      onPress={() => router.push(`/expenses/${id}`)}
      activeOpacity={0.6}
      className="mb-3"
    >
      <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-row items-center"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {/* Icon */}
        <View 
          className="w-12 h-12 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: isExpense ? '#FEE2E2' : '#D1FAE5' }}
        >
          <Ionicons name={iconName as any} size={24} color={iconColor} />
        </View>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row justify-between items-start mb-1">
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-0.5" numberOfLines={1}>
                {note || payment_mode || 'Transaction'}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {format(new Date(date), 'EEE, dd MMM')} • {format(new Date(date), 'HH:mm')}
              </Text>
            </View>
            <View className="items-end">
              <Text className={cn('text-base font-bold', amountColor)}>
                {amountPrefix}${Math.abs(amount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
              {accountName && (
                <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {accountName}
                </Text>
              )}
            </View>
          </View>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5 mt-2">
              {tags.slice(0, 3).map((tag) => (
                <View
                  key={tag.id}
                  className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg"
                >
                  <Text className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                    {tag.name}
                  </Text>
                </View>
              ))}
              {tags.length > 3 && (
                <View className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                  <Text className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                    +{tags.length - 3}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

