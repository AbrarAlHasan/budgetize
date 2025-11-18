import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/utils/cn';

interface TagChipProps {
  name: string;
  onPress?: () => void;
  selected?: boolean;
  className?: string;
  showIcon?: boolean;
}

export function TagChip({ name, onPress, selected = false, className, showIcon = true }: TagChipProps) {
  const content = (
    <View
      className={cn(
        'px-4 py-2.5 rounded-xl flex-row items-center gap-2',
        selected
          ? 'bg-blue-500 dark:bg-blue-600'
          : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
        className
      )}
      style={selected ? {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
      } : undefined}
    >
      {showIcon && (
        <Ionicons 
          name={selected ? "checkmark-circle" : "pricetag-outline"} 
          size={16} 
          color={selected ? "#FFFFFF" : "#6B7280"} 
        />
      )}
      <Text
        className={cn(
          'text-sm font-semibold',
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

