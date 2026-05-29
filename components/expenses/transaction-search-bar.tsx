import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
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
  compact?: boolean;
  /** Removes bottom margin when placed in a horizontal row. */
  embedded?: boolean;
  /** Filled surface without border — preferred on Expenses. */
  variant?: 'outline' | 'filled';
}

function TransactionSearchBarComponent({
  value,
  onChangeText,
  onClear,
  isDebouncing = false,
  compact = false,
  embedded = false,
  variant = 'outline',
}: TransactionSearchBarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isFilled = variant === 'filled';

  const containerStyle = isFilled
    ? {
        backgroundColor: isDark ? '#1C1C1E' : '#EFEFF4',
        borderWidth: 0,
      }
    : {
        backgroundColor: isDark ? '#111827' : '#FFFFFF',
        borderWidth: 1,
        borderColor: isDark ? '#374151' : '#E5E7EB',
      };

  return (
    <View
      className={`flex-row items-center ${
        embedded ? 'mb-0' : compact ? 'mb-2' : 'mb-4'
      } ${isFilled ? 'rounded-2xl px-3.5' : 'rounded-2xl border px-4'} ${
        compact ? 'py-2.5' : 'py-3'
      }`}
      style={containerStyle}
    >
      <View
        className="h-8 w-8 items-center justify-center rounded-full"
        style={{
          backgroundColor: isFilled
            ? isDark
              ? '#2C2C2E'
              : '#FFFFFF'
            : 'transparent',
        }}
      >
        <Ionicons
          name="search"
          size={compact ? 17 : 18}
          color={isDark ? '#9CA3AF' : '#6B7280'}
        />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search note or payment mode"
        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
        className={`flex-1 text-gray-900 dark:text-gray-100 ${
          compact ? 'text-[15px]' : 'text-base'
        }`}
        style={{ marginLeft: 4, paddingVertical: 0 }}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        returnKeyType="search"
        blurOnSubmit={false}
      />
      {isDebouncing ? (
        <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 6 }} />
      ) : null}
      {value.length > 0 ? (
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Clear search"
          className="h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: isDark ? '#2C2C2E' : '#D1D5DB' }}
        >
          <Ionicons name="close" size={14} color={isDark ? '#E5E7EB' : '#FFFFFF'} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export const TransactionSearchBar = React.memo(TransactionSearchBarComponent);
