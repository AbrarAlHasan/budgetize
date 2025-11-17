import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { cn } from '@/utils/cn';

interface TagChipProps {
  name: string;
  onPress?: () => void;
  selected?: boolean;
  className?: string;
}

export function TagChip({ name, onPress, selected = false, className }: TagChipProps) {
  const content = (
    <View
      className={cn(
        'px-3 py-1 rounded-full',
        selected
          ? 'bg-blue-500 dark:bg-blue-600'
          : 'bg-gray-200 dark:bg-gray-700',
        className
      )}
    >
      <Text
        className={cn(
          'text-xs font-medium',
          selected
            ? 'text-white'
            : 'text-gray-700 dark:text-gray-300'
        )}
      >
        {name}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

