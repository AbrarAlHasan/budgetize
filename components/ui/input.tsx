import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';
import { cn } from '@/utils/cn';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </Text>
      )}
      <TextInput
        className={cn(
          'border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3',
          'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
          'focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800',
          error && 'border-red-500',
          className
        )}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
      {error && (
        <Text className="mt-1 text-sm text-red-500">{error}</Text>
      )}
    </View>
  );
}

