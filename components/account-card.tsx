import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { DecryptedAccount } from '@/db/schema/types';
import { Card } from './ui/card';
import { cn } from '@/utils/cn';
import { router } from 'expo-router';
import { useSettingsStore } from '@/store/settings-store';
import { getCurrencySymbol } from '@/utils/currencies';

interface AccountCardProps {
  account: DecryptedAccount;
}

export function AccountCard({ account }: AccountCardProps) {
  const { settings } = useSettingsStore();

  const getAccountTypeColor = (type: DecryptedAccount['type']) => {
    switch (type) {
      case 'debit':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'credit':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'borrowed':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
      case 'lent':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <TouchableOpacity
      onPress={() => router.push(`/accounts/${account.id}`)}
      activeOpacity={0.7}
    >
      <Card className="mb-3">
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {account.name}
            </Text>
            {account.bank_name && (
              <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {account.bank_name}
              </Text>
            )}
            <View className="flex-row items-center gap-2">
              <View className={cn('px-2 py-1 rounded', getAccountTypeColor(account.type))}>
                <Text className="text-xs font-medium capitalize">{account.type}</Text>
              </View>
              {account.type === 'credit' && account.credit_limit && (
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Limit: {getCurrencySymbol(settings.currency)}{account.credit_limit.toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

