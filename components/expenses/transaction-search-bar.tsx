import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface TransactionSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  isDebouncing?: boolean;
}

function TransactionSearchBarComponent({
  value,
  onChangeText,
  onClear,
  isDebouncing = false,
}: TransactionSearchBarProps) {
  return (
    <View className="mb-4 flex-row items-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
      <Ionicons name="search" size={20} color="#9CA3AF" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search note or payment mode..."
        placeholderTextColor="#9CA3AF"
        className="flex-1 ml-3 text-base text-gray-900 dark:text-gray-100"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        returnKeyType="search"
        blurOnSubmit={false}
      />
      {isDebouncing ? (
        <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 8 }} />
      ) : null}
      {value.length > 0 ? (
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export const TransactionSearchBar = React.memo(TransactionSearchBarComponent);
